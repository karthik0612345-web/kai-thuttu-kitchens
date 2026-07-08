importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAlOeAFg3-wybxV3HTDc91EP5yHU4qZ5bg",
  authDomain: "kai-thuttu-kitchens.firebaseapp.com",
  projectId: "kai-thuttu-kitchens",
  storageBucket: "kai-thuttu-kitchens.firebasestorage.app",
  messagingSenderId: "227106760448",
  appId: "1:227106760448:web:d9775a0accb45b5d4275e5",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || "Order update", {
    body: body || "Your Kai Thuttu Kitchens order status changed.",
    icon: icon || "/kai-thuttu-logo.jpeg",
  });
});
