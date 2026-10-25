import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 삼호철새마을 게스트하우스 Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCM6DjDBTWTWAArKCriwB1x866vtJnG0zk",
  authDomain: "gueststap-9b7a4.firebaseapp.com",
  projectId: "gueststap-9b7a4",
  storageBucket: "gueststap-9b7a4.firebasestorage.app",
  messagingSenderId: "787196370918",
  appId: "1:787196370918:web:391efc37e2b744f8798027",
  measurementId: "G-EETG2Z3Q6V"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);