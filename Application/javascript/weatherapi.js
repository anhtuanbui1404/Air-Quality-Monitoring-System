function getWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const apiKey = ''; // Sử dụng khóa API của bạn:24d5975d652d435e921140106243009
            const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lon}&aqi=yes`;

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Không tìm thấy thông tin thời tiết');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.current) {
                        // Cập nhật vị trí và nhiệt độ
                        document.querySelector('#weatherResult h2').innerText = `Thành phố: ${data.location.name}, ${data.location.country}`;
                        document.querySelector('#weatherResult .temp').innerText = `Nhiệt độ ${data.current.temp_c} °C (Cảm giác như: ${data.current.feelslike_c} °C)`;
                        document.querySelector('#weatherResult .condition').innerHTML = `Thời tiết: 
                            <img src="${data.current.condition.icon}" alt="${data.current.condition.text}" /> 
                            ${data.current.condition.text}`;

                        // Cập nhật các chi tiết thời tiết khác
                        document.querySelector('.air-quality').innerText = `${data.current.air_quality.pm2_5.toFixed(0)} (PM2.5)`;
                        document.querySelector('.wind').innerText = `${data.current.wind_kph} km/h`;
                        document.querySelector('.visibility').innerText = `${data.current.vis_km} km`;
                        document.querySelector('.pressure').innerText = `${data.current.pressure_mb} mb`;
                    } else {
                        throw new Error('Dữ liệu không hợp lệ');
                    }
                })
                .catch(error => {
                    document.getElementById('weatherResult').innerHTML = error.message;
                });
        }, error => {
            document.getElementById('weatherResult').innerHTML = 'Không thể lấy vị trí. Vui lòng kiểm tra cài đặt vị trí của bạn.';
        });
    } else {
        document.getElementById('weatherResult').innerHTML = 'Trình duyệt không hỗ trợ Geolocation.';
    }
}
// Hiển thị phần article sau khi người dùng đăng nhập thành công
//document.getElementById('content-sign-in').style.display = 'block';
