import AsyncStorage from '@react-native-async-storage/async-storage'
import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import 'firebase/compat/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCxg3J9IDnvqJDqSmUcE92G7OjdAhKfKFE',
  authDomain: 'caozi-5e0f2.firebaseapp.com',
  projectId: 'caozi-5e0f2',
  storageBucket: 'caozi-5e0f2.firebasestorage.app',
  messagingSenderId: '765167488046',
  appId: '1:765167488046:web:63c60f77ab34a0cfd863bf',
}

// Initialize Firebase nếu chưa được khởi tạo
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

// Set persistence cho AsyncStorage
firebase.auth().setPersistence({
  type: 'LOCAL',
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  getItem: (key) => AsyncStorage.getItem(key),
  removeItem: (key) => AsyncStorage.removeItem(key),
})

// Export auth and firestore
export const auth = firebase.auth()
export const db = firebase.firestore()

export default firebase
