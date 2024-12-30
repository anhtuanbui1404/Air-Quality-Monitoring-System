// THƯ VIỆN SỬ DỤNG:
#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <MQUnifiedsensor.h>
#include "DHT.h"
// Cung cấp thông tin về quy trình tạo mã thông báo.
#include "addons/TokenHelper.h"
// Cung cấp thông tin in tải trọng RTDB và các hàm trợ giúp khác.
#include "addons/RTDBHelper.h"
// ID VÀ MK WIFI KẾT NỐI:
#define WIFI_SSID "NAMEWIFI"
#define WIFI_PASS "PASSWIFI"

// KHAI BÁO VÀ ĐỊNH NGHĨA CHO CẢM BIẾN MQ135 
#define placa "ESP32"
#define Voltage_Resolution 5                               
#define pin 34          //GPIO32 ĐỂ ĐỌC GIÁ TRỊ ANALOG                                    
#define type "MQ-135"                                       
#define ADC_Bit_Resolution 12                               
#define RatioMQ135CleanAir 3.6                              
MQUnifiedsensor MQ135(placa, Voltage_Resolution, ADC_Bit_Resolution, pin, type);      //ĐỌC GIÁ TRỊ CẢM BIẾN THEO CÁC BIẾN ĐƯỢC ĐỊNH NGHĨA
// CHÂN NỐI VỚI ESP32 VÀ LOẠI CẢM BIẾN DHT11
DHT dht(14, DHT11);
                                                                          /* CÁC CHÂN KẾT NỐI VỚI CẢM BIẾN PM2.5 ĐO NỒNG ĐỘ BỤI/KHÓI TRONG KHÔNG KHÍ
                                                                          http://www.sparkfun.com/datasheets/Sensors/gp2y1010au_e.pdf
                                                                          Sharp pin 1 (V-LED) => 5V (connected to 150ohm resister)
                                                                          Sharp pin 2 (LED-GND) => esp32 GND pin
                                                                          Sharp pin 3 (LED) => eGPIO14 OUTPUT 
                                                                          Sharp pin 4 (S-GND) => esp32 GND pin
                                                                          Sharp pin 5 (Vo) => esp32 GPIO34 pin       - ĐỂ ĐỌC GIÁ TRỊ ANALOG
                                                                          Sharp pin 6 (Vcc) => 5V
                                                                          */
constexpr uint8_t PIN_AOUT = 35;
constexpr uint8_t PIN_IR_LED = 27;
#define OPERATING_VOLTAGE 3.3 
float zeroSensorDustDensity = 0.6;
int sensorADC;
float sensorVoltage;
float sensorDustDensity;

int samplingTime = 280;
int deltaTime = 40;
int sleepTime = 9680;        //10000-280-40  - chi tiết truy cập: http://arduino.vn/tutorial/6073-su-dung-cam-bien-bui-sharp-gp2y10
// KHỞI TẠO CÁC BIÉN ĐỌC TỪ CÁC CHÂN
float voMeasured = 0; 
float calcVoltage = 0;
// KHỞI TẠO GIÁ TRỊ ĐO NỒNG ĐỘ BỤI đơn vị đo ug/m3 (microgam trên mét khối)
float dustDensity = 0;

//THIẾT LẬP CÁC BIẾN ĐỂ CÓ THỂ KẾT NỐI VỚI REALTIME DATABASE CỦA FIREBASE
// khai báo API Key
#define API_KEY "..."					//...KHAI BÁO API KEY CỦA BẠN
// khai báo Email đã đăng ký ủy quyền và Password
#define USER_EMAIL "YOUREMAIL"
#define USER_PASSWORD "PASSEMAIL"
// khai báo RTDB URL
#define DATABASE_URL "...https:....app/"     ////KHAI BÁO ĐỊA CHỈ URL CỦA DỰ ÁN
// định nghĩa các đối tượng trong Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
// biến lưu trữ UID người dùng
String uid;
// đường dẫn chính tới database (sẽ được cập nhật trong quá trình thiết lập kết nối tới UID người dùng)
String databasePath;
// các node con trong database
String tempPath = "/temperature";
String humPath = "/humidity";
String COPath = "/CO";
String CO2Path = "/CO2";
String NH4Path = "/NH4";
String dustDensityPath = "/dustDensity";
String timePath = "/timestamp";
// Node cha (dduowcj cập nhật lên realtime database trong mỗi vòng lặp)
String parentPath;
int timestamp;
FirebaseJson json;
const char* ntpServer = "pool.ntp.org";
// Timer variables (send new readings every three minutes)
unsigned long sendDataPrevMillis = 0;
unsigned long timerDelay = 5000;

// HÀM HIỆU CHUẨN R0:
void calcR0(){
  // Khởi tạo và tính giá trị hiệu chuẩn Ro (Rzero) theo công thức hiệu chuẩn từ nhà sản xuất cảm biến và cộng đòng người dùng, chi tiết truy cập: 
  MQ135.setRegressionMethod(1);
  MQ135.init();
  float calcR0 = 0;
  for(int i = 1; i <= 10; i++) {
    MQ135.update();
    calcR0 += MQ135.calibrate(RatioMQ135CleanAir);
  }
  MQ135.setR0(calcR0 / 10);
  if(isinf(calcR0) || calcR0 == 0) {
    Serial.println("Warning: Lỗi kết nối với cảm , R0 vô cùng.");
    while(1);
  }
  // if(calcR0 == 0) {
  //   Serial.println("Warning: Lỗi kết nối với cảm biến, R0 bằng 0.");
  //   while(1);
  // }
  delay(10000);
}
// HÀM KẾT NỐI WiFi
void initWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    delay(1000);
  }
  Serial.println("Connecting to WiFi....");
  Serial.print("Wi-Fi IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println();
}
// MẤT KẾT NỐI VỚI WIFI
void ensureWiFiConnected() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Mất kết nối WiFi. Đang thử kết nối lại...");
    WiFi.disconnect();
    initWiFi();
  }
}

void connectRTDB(){
  /// KẾT NỐI TỚI REALTIME DATABASE
  configTime(0, 0, ntpServer);
  // gán api key (bắt buộc phải có )
  config.api_key = API_KEY;
  // gán thông tin đăng nhập của người dùng
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  // gán RTDB URL (bắt buộc phải có )
  config.database_url = DATABASE_URL;
  Firebase.reconnectWiFi(true);
  fbdo.setResponseSize(4096);                                   // Assign the callback function for the long running token generation task */
  config.token_status_callback = tokenStatusCallback;           //see addons/TokenHelper.h     // Assign the maximum retry of token generation
  config.max_token_generation_retry = 5;                        // khởi tạo thư viện Firebase authen và config
  Firebase.begin(&config, &auth);                               // lấy UID người dùng/ đki realtime database
  Serial.println("Getting User UID");
  while ((auth.token.uid) == "") {                              // in ra UID người dùng đã đăng ký
    Serial.print('.');
    delay(1000);
  }
  uid = auth.token.uid.c_str();
  Serial.print("User UID: ");
  Serial.println(uid);
  databasePath = "/UsersData/" + uid + "/readings";             // cập nhật database path
}

// Hàm lấy thời gian hiện tại
unsigned long getTime() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    //Serial.println("Không lấy được thời gian");
    return(0);
  }
  time(&now);
  return now;
}

void setup() {
  Serial.begin(9600);
  initWiFi();                           // khởi chay hàm kết nối wifi:
  dht.begin();                          // khởi chạy hàm đo giá trị cảm biến DHT11
  pinMode(PIN_IR_LED, OUTPUT);
  digitalWrite(PIN_IR_LED, LOW);// khởi chạy cảm biến PM2.5
  calcR0();                             // khởi chạ hàm tính toán hiệu chuẩn R0:
  connectRTDB();                        // khởi chạy hàm kết nối tới firebase:
  Serial.println("** GIÁ TRỊ ĐO ĐƯỢC TỪ CÁC CẢM BIẾN**");
}

void loop() {
  // gọi hàm Kiểm tra và duy trì kết nối WiFi
  ensureWiFiConnected();
  // đo các thông số nhiệt độ độ ẩm
  float tc = dht.readTemperature(false);  
  float tf = dht.readTemperature(true);   
  float hu = dht.readHumidity();
  // đo các thông số nồng độ ppm các khí
  MQ135.update(); 
  MQ135.setA(605.18); MQ135.setB(-3.937); 
  float CO = MQ135.readSensor(); 
  MQ135.setA(110.47); MQ135.setB(-2.862);
  float CO2 = MQ135.readSensor();
  MQ135.setA(102.2); MQ135.setB(-2.473);
  float NH4 = MQ135.readSensor();
  // đo nồng độ bụi mịn/khói trong không khí:
  sensorADC = 0; // Обнуляем перед циклом
  for (int i = 0; i < 10; i++) {
    digitalWrite(PIN_IR_LED, HIGH);
    delayMicroseconds(280);
    sensorADC += analogRead(PIN_AOUT);
    digitalWrite(PIN_IR_LED, LOW);
    delay(10);
  }
  sensorADC = sensorADC / 10;
  sensorVoltage = (OPERATING_VOLTAGE / 1024.0) * sensorADC * 11;         //Tính điện áp từ giá trị ADC (12bit) - Điệp áp Vcc của cảm biến (5.0 hoặc 3.3)
  // Linear Equation http://www.howmuchsnow.com/arduino/airquality/   - Chris Nafis (c) 2012
  //Tính nồng độ bụi mịn theo điện áp từ cảm biến 
  if (sensorVoltage < zeroSensorDustDensity) {
    sensorDustDensity = 0;
  } else {
    sensorDustDensity = 0.17 * sensorVoltage - 0.1;
  }

  // in ra serial monitor giá trị đo được:
  Serial.println("===================================================");
  Serial.println("GIÁ TRỊ NHIỆT ĐỘ ĐỘ ẨM ĐO ĐƯỢC");
  Serial.print("temp (Celsius): ");
  Serial.print(tc); 
  Serial.println(" *C");
  Serial.print("temp (Fahrenheit): ");
  Serial.print(tf);
  Serial.println(" *F");
  Serial.print("Humidity: ");
  Serial.print(hu);
  Serial.println(" %");
  Serial.println("GIÁ TRỊ NỒNG ĐỘ CÁC KHÍ ĐO ĐƯỢC");
  Serial.print("CO: ");
  Serial.print(CO);
  Serial.println(" PPM");

  Serial.print("CO2: ");
  Serial.print(CO2 + 400);    
  Serial.println(" PPM");   

  Serial.print("NH4: ");
  Serial.print(NH4); 
  Serial.println(" PPM");
  Serial.println("GIÁ TRỊ ĐIỆN ÁP TƯƠNG ỨNG VÀ NỒNG ĐỘ BỤI MỊN/KHÓI TRONG KHÔNG KHÍ ĐO ĐƯỢC");
  Serial.print("Voltage: ");
  Serial.print(sensorVoltage);
  Serial.print(" V\tDust Density: ");
  Serial.print(sensorDustDensity);
  Serial.println(" ug/m3");
  Serial.println("===================================================");

  // gửi các dữ liệu mới thu thâp và đọc được tới realtime database
  if (Firebase.ready() && (millis() - sendDataPrevMillis > timerDelay || sendDataPrevMillis == 0)){
    sendDataPrevMillis = millis();
    //lấy thời giạn hiện tại
    timestamp = getTime();
    Serial.print ("time: ");
    Serial.println (timestamp);
    parentPath= databasePath + "/" + String(timestamp);

    json.set(tempPath.c_str(), String(tc));
    json.set(humPath.c_str(), String(hu));
    json.set(COPath.c_str(), String(CO));
    json.set(CO2Path.c_str(), String(CO2 + 400));
    json.set(NH4Path.c_str(), String(NH4));
    json.set(dustDensityPath.c_str(), String(sensorDustDensity));
    json.set(timePath, String(timestamp));
    if (Firebase.RTDB.setJSON(&fbdo, parentPath.c_str(), &json)) {//
      Serial.printf("Set json... %s\n", Firebase.RTDB.setJSON(&fbdo, parentPath.c_str(), &json) ? "ok" : fbdo.errorReason().c_str());
    } else {//
      Serial.print("Lỗi khi gửi dữ liệu: ");//
      Serial.println(fbdo.errorReason());//
    }//
  }
  delay(1000);
}
