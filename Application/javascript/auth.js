document.addEventListener("DOMContentLoaded", function(){
    ////LẮNG NGHE CÁC TRẠNG THÁI THAY ĐỔI ĐỂ XÁC THỰC
    auth.onAuthStateChanged(user => {
        if (user) {
          console.log("user logged in");
          console.log(user);
          setupUI(user);
          var uid = user.uid;
          console.log(uid);
        } else {
          console.log("user logged out");
          setupUI();
        }
    });

    //////DĂNG NHẬPP (LOGIN)
    const loginForm = document.querySelector('#login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // LẤY THÔNG TIN NGƯỜI DUNGF ĐƯỢC LẤY TỪ CSDL LƯU DANH TÍNH TRÊN FIREBASE
        const email = loginForm['input-email'].value;
        const password = loginForm['input-password'].value;
        // ĐĂNG NHẬP KHI NGƯỜI DÙNG LÀ ĐÚNG
        auth.signInWithEmailAndPassword(email, password).then((cred) => {
            //// ĐỐNG MẪU ĐĂNG NHẬP VÀ RESET LẠI FORM ĐĂNG NHÂPK
            loginForm.reset();
            console.log(email);
        })
        .catch((error) =>{
            const errorCode = error.code;
            const errorMessage = error.message;
            document.getElementById("error-message").innerHTML = errorMessage;
            console.log(errorMessage);
        });
    });

    // ĐĂNG XUẤT KHỎI WEB (LOGOUT)
    const logout = document.querySelector('#logout-link');
    logout.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });
});  