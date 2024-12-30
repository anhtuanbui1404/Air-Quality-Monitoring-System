// chuyển đổi thời gian sang đối tượng Date của JavaScript
function epochToJsDate(epochTime){
    return new Date(epochTime*1000);
  }
  
  // chuyển đổi thời gian thành định dạng năm/tháng/ngày giờ:phút:giây
  function epochToDateTime(epochTime){
    var epochDate = new Date(epochToJsDate(epochTime));
    var dateTime = epochDate.getFullYear() + "/" +
      ("00" + (epochDate.getMonth() + 1)).slice(-2) + "/" +
      ("00" + epochDate.getDate()).slice(-2) + " " +
      ("00" + epochDate.getHours()).slice(-2) + ":" +
      ("00" + epochDate.getMinutes()).slice(-2) + ":" +
      ("00" + epochDate.getSeconds()).slice(-2);
  
    return dateTime;
  }
  
  // fHàm vẽ giá trị lên biểu đồ
  function plotValues(chart, timestamp, value){
    var x = epochToJsDate(timestamp).getTime();
    var y = Number (value);
    if(chart.series[0].data.length > 40) {
      chart.series[0].addPoint([x, y], true, true, true);
    } else {
      chart.series[0].addPoint([x, y], true, false, true);
    }
  }
  
  // lấy các phần tử DOM được gọi từ các class, id từ giao diện web trong file HTML
  const loginElement = document.querySelector('#login-form');
  const contentElement = document.querySelector("#content-sign-in");
  const userDetailsElement = document.querySelector('#user-details');
  const authBarElement = document.querySelector('#authentication-bar');
  const deleteButtonElement = document.getElementById('delete-button');
  const deleteModalElement = document.getElementById('delete-modal');
  const deleteDataFormElement = document.querySelector('#delete-data-form');
  const viewDataButtonElement = document.getElementById('view-data-button');
  const hideDataButtonElement = document.getElementById('hide-data-button');
  const tableContainerElement = document.querySelector('#table-container');
  const chartsRangeInputElement = document.getElementById('charts-range');
  const loadDataButtonElement = document.getElementById('load-data');
  const cardsCheckboxElement = document.querySelector('input[name=cards-checkbox]');
  const chartsCheckboxElement = document.querySelector('input[name=charts-checkbox]');
  
  // các phần tử DOM cho các chỉ số cảm biến đo được
  const cardsReadingsElement = document.querySelector("#cards-div");
  const chartsDivElement = document.querySelector('#charts-div');
  const tempElement = document.getElementById("temp");
  const humElement = document.getElementById("hum");
  const coElement = document.getElementById("co");
  const co2Element = document.getElementById("co2");
  const nh4Element = document.getElementById("nh4");
  const dustDensityElement = document.getElementById("dustDensity");
  const updateElement = document.getElementById("lastUpdate")
  
  // quản lý giaoo diênj đăng nhập/đăng xuất 
  const setupUI = (user) => {
    if (user) {
      // chuyển đổi trạng thái hiển thị của các phần tử giao diện (UI)
      loginElement.style.display = 'none';
      contentElement.style.display = 'block';
      authBarElement.style.display ='block';
      userDetailsElement.style.display ='block';
      userDetailsElement.innerHTML = user.email;
  
      // lấy UID của người dùng (ĐÃ ĐĂNG KÝ KHI TẠO PROJECT TRÊN FIREBASE) để lấy dữ liệu từ cơ sở dữ liệu
      var uid = user.uid;
      console.log(uid);
  
      // Đường dẫn tới cơ sở dữ liệu đã thiết lập ở phần cứng gửi lên realtime database(cùng với UID người dùng)
      var dbPath = 'UsersData/' + uid.toString() + '/readings';
      var chartPath = 'UsersData/' + uid.toString() + '/charts/range';
  
      // tham chiếu đến cơ sở dữ liệu
      var dbRef = firebase.database().ref(dbPath);
      var chartRef = firebase.database().ref(chartPath);
  
      //////BIỂU ĐỒ
      // Số lượng dữ liệu cần vẽ trên biểu đồ
      var chartRange = 0;
      // lấy số lượng dữ liệu cần vẽ được lưu trên cơ sở dữ liệu (chạy khi trang vừa tải và mỗi khi có thay đổi trong cơ sở dữ liệu)
      chartRef.on('value', snapshot =>{
        chartRange = Number(snapshot.val());
        console.log(chartRange);
        // xóa tất cả dữ liệu trên biểu đồ để cập nhật với các giá trị mới khi chọn một phạm vi mới
        chartT.destroy();
        chartH.destroy();
        chartco2.destroy();
        // vẽ biểu đồ mới để hiển thị phạm vi dữ liệu mới (ĐƯỢC NHẬP TRÊN GIAO DIỆN VÀ IMPORT VÀO)
        chartT = createTemperatureChart();
        chartH = createHumidityChart();
        chartco2 = createco2Chart();
        // cập nhật biểu đồ với phạm vi mới
        // lấy dữ liệu mới nhất và vẽ lên biểu đồ (số lượng dữ liệu được vẽ tương ứng với giá trị của chartRange)
        dbRef.orderByKey().limitToLast(chartRange).on('child_added', snapshot =>{
          var jsonData = snapshot.toJSON(); // example: {temperature: 25.02, humidity: 50.20, pressure: 1008.48, timestamp:1641317355}
          // lưu giá trị vào biến
          var temperature = jsonData.temperature;
          var humidity = jsonData.humidity;
          var co2 = jsonData.co2;

          var timestamp = jsonData.timestamp;
          /// vẽ các giá trị lên biểu đồ
          plotValues(chartT, timestamp, temperature);
          plotValues(chartH, timestamp, humidity);
          plotValues(chartco2, timestamp, co2);

        });
      });
  
      // cập nhật cơ sở dữ liệu với phạm vi mới (ô nhập liệu)
      chartsRangeInputElement.onchange = () =>{
        chartRef.set(chartsRangeInputElement.value);
      };
  
      //CHECKBOXES
      // Checbox (thẻ hiển thị các hộp, bảng phân vùng cho các chỉ số cảm biến)
      cardsCheckboxElement.addEventListener('change', (e) =>{
        if (cardsCheckboxElement.checked) {
          cardsReadingsElement.style.display = 'block';
        }
        else{
          cardsReadingsElement.style.display = 'none';
        }
      });
  
      // Checbox (bảng phân vùng các biểu đồ cho các chỉ số cảm biến)
      chartsCheckboxElement.addEventListener('change', (e) =>{
        if (chartsCheckboxElement.checked) {
          chartsDivElement.style.display = 'block';
        }
        else{
          chartsDivElement.style.display = 'none';
        }
      });
  
      // CARDS
      // lấy các chỉ số mới nhất và hiển thị trên thẻ
      dbRef.orderByKey().limitToLast(1).on('child_added', snapshot =>{
        var jsonData = snapshot.toJSON(); // example: {temperature: 25.02, humidity: 50.20, pressure: 1008.48, timestamp:1641317355}
        var temperature = jsonData.temperature;
        var humidity = jsonData.humidity;
        var CO = jsonData.CO;
        var CO2 = jsonData.CO2;
        var NH4 = jsonData.NH4;
        var dustDensity = jsonData.dustDensity;
        var timestamp = jsonData.timestamp;
        // cập nhật các phần tử DOM và hiển thị dữ liệu sớm nhất đo được từ phần cứng gửi lên realtime database
        tempElement.innerHTML = temperature;
        humElement.innerHTML = humidity;
        coElement.innerHTML = CO;
        co2Element.innerHTML = CO2;
        nh4Element.innerHTML = NH4;
        dustDensityElement.innerHTML = dustDensity;
        updateElement.innerHTML = epochToDateTime(timestamp)
        updateElement.innerHTML = epochToDateTime(timestamp);
      });
  
      //////XÓA TẤT CẢ DỮ LIỆU
      // thêm sự kiện khi nhấn nút "Delete Data" để mở hộp thoại
      deleteButtonElement.addEventListener('click', e =>{
        console.log("Remove data");
        e.preventDefault;
        deleteModalElement.style.display="block";
      });
  
      // thêm sự kiện khi nộp biểu mẫu xóa dữ liệu
      deleteDataFormElement.addEventListener('submit', (e) => {
        // xóa dữ liệu (chỉ số)
        dbRef.remove();
      });
  
      // TABLE
      var lastReadingTimestamp;  // lưu lại timestamp cuối cùng được hiển thị trên bảng
      // hàm tạo bảng với 100 chỉ số đầu tiên
      function createTable(){
        // chèn tất cả dữ liệu vào bảng
        var firstRun = true;
        dbRef.orderByKey().limitToLast(100).on('child_added', function(snapshot) {
          if (snapshot.exists()) {
            var jsonData = snapshot.toJSON();
            console.log(jsonData);
            var temperature = jsonData.temperature;
            var humidity = jsonData.humidity;
            var CO = jsonData.CO;
            var CO2 = jsonData.CO2;
            var NH4 = jsonData.NH4;
            var dustDensity = jsonData.dustDensity;
            var timestamp = jsonData.timestamp;
            var content = '';
            content += '<tr>';
            content += '<td>' + epochToDateTime(timestamp) + '</td>';
            content += '<td>' + temperature + '</td>';
            content += '<td>' + humidity + '</td>';
            content += '<td>' + CO2 + '</td>';
            content += '<td>' + CO + '</td>';
            content += '<td>' + NH4 + '</td>';
            content += '<td>' + dustDensity + '</td>';
            content += '</tr>';
            $('#tbody').prepend(content);
            /// lưu lại lastReadingTimestamp --> tương ứng với timestamp đầu tiên của dữ liệu snapshot trả về
            if (firstRun){
              lastReadingTimestamp = timestamp;
              firstRun=false;
              console.log(lastReadingTimestamp);
            }
          }
        });
      };
  
      // chèn thêm chỉ sôs vào bảng (sau khi nhấn nút "More results...")
      function appendToTable(){
        var dataList = []; // lưu danh sách chỉ số được snapshot trả về (từ cũ --> mới)
        var reversedList = [];// giống như trên, nhưng đảo ngược (mới --> cũ)
        console.log("APEND");
        dbRef.orderByKey().limitToLast(100).endAt(lastReadingTimestamp).once('value', function(snapshot) {
          // chuyển snapshot sang định dạng JSON
          if (snapshot.exists()) {
            snapshot.forEach(element => {
              var jsonData = element.toJSON();
              dataList.push(jsonData);// tạo danh sách chứa tất cả dữ liệu
            });
            lastReadingTimestamp = dataList[0].timestamp; /// timestamp cũ nhất tương ứng với phần tử đầu tiên trong danh sách (cũ nhất --> mới nhất)
            reversedList = dataList.reverse(); // đảo ngược thứ tự danh sách (dữ liệu mới nhất --> cũ nhất)
  
            var firstTime = true;
            /// lặp qua tất cả phần tử của danh sách và chèn vào bảng (phần tử mới nhất trước)
            reversedList.forEach(element =>{
              if (firstTime){ /// bỏ qua chỉ số đầu tiên (đã có sẵn trên bảng từ truy vấn trước đó)
                firstTime = false;
              }
              else{
                var temperature = element.temperature;
                var humidity = element.humidity;
                var CO = jsonData.CO;
                var CO2 = jsonData.CO2;
                var NH4 = jsonData.NH4;
                var dustDensity = jsonData.dustDensity;
                var timestamp = jsonData.timestamp;
                var content = '';
                content += '<tr>';
                content += '<td>' + epochToDateTime(timestamp) + '</td>';
                content += '<td>' + temperature + '</td>';
                content += '<td>' + humidity + '</td>';
                content += '<td>' + CO2 + '</td>';
                content += '<td>' + CO + '</td>';
                content += '<td>' + NH4 + '</td>';
                content += '<td>' + dustDensity + '</td>';
                content += '</tr>';
                $('#tbody').append(content);
              }
            });
          }
        });
      }
  
      viewDataButtonElement.addEventListener('click', (e) =>{
        // chuyển đổi các phần tử DOM 
        tableContainerElement.style.display = 'block';
        viewDataButtonElement.style.display ='none';
        hideDataButtonElement.style.display ='inline-block';
        loadDataButtonElement.style.display = 'inline-block'
        createTable(); ///GỌI HÀM TẠO BẢNG
      });
  
      loadDataButtonElement.addEventListener('click', (e) => {
        appendToTable(); ///GỌI HÀM THÊM DỮ LIỆU VÀO BẢNG
      });
  
      hideDataButtonElement.addEventListener('click', (e) => {
        tableContainerElement.style.display = 'none'; // ẩn phần tử chứa bảng
        viewDataButtonElement.style.display = 'inline-block';// hiển thị nút xem dữ liệu
        hideDataButtonElement.style.display = 'none'; // ẩn nút ẩn dữ liệu
      });
  
    // NẾU NGƯỜI DÙNG ĐÃ ĐĂNG XUẤT
    } else{
      // chuyển đổi các phần tử giao diện người dùng (UI)
      loginElement.style.display = 'block';// hiển thị phần tử đăng nhập
      authBarElement.style.display ='none';// ẩn thanh xác thực
      userDetailsElement.style.display ='none';// ẩn chi tiết người dùng
      contentElement.style.display = 'none'; // ẩn nội dung
    }
  }