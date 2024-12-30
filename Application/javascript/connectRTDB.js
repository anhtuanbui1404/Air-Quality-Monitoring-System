
// Rcác cấu hình applicatni đăng kí khi tiến hành tạo app trong project firebase
const firebaseConfig = {
  apiKey: "...AIzaSyCsyvXFW657h5VI1c2jZQa89O4RTFO40Hw",						///ĐIỀN THÔNG TIN CỦA BẠN THEO MẪU
  authDomain: "...test-senior-project-634ba.firebaseapp.com",
  databaseURL: "...https://test-senior-project-634ba-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "...test-senior-project-634ba",
  storageBucket: "...test-senior-project-634ba.appspot.com",
  messagingSenderId: "...574615049755",
  appId: "...1:574615049755:web:9847b03ff61d8ea01c8abe"
  };

// khởi tạo firebase
firebase.initializeApp(firebaseConfig);

/// tạô các tham chiếu đến auth và database
const auth = firebase.auth();
const db = firebase.database();
