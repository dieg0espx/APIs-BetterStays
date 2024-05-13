const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, getDocs, updateDoc, collection } = require("firebase/firestore");
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const port = 4000;


//  ============== FIREBASE CONFIG ============== //
const firebaseConfig = {
    apiKey: "AIzaSyCFC0dwnbeqz_vCLUIv6yg3piDwFXwAvm0",
    authDomain: "betterstays-71a09.firebaseapp.com",
    projectId: "betterstays-71a09",
    storageBucket: "betterstays-71a09.appspot.com",
    messagingSenderId: "1055920424862",
    appId: "1:1055920424862:web:ced65ad7686ade7775388f",
    measurementId: "G-982N0ZXLWE"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const app = express();
app.use(bodyParser.json())
app.use(cors())


const tokenRef = doc(db, "token", "token");

function dateFormatted(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

async function getCurrentToken(){
    try {
        const tokenRef = doc(db, "token", "token");
        const docSnap = await getDoc(tokenRef);
        if (docSnap.exists()) {
          const token = docSnap.data().token;
          const date = docSnap.data().date;
          const todayte = dateFormatted(new Date());

          if(date !== todayte){
            return getNewToken(); 
          }
          return token
        }
    } catch (error) {
      return "Internal server Error";
    }
}

async function getNewToken(){
  const requestData = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'open-api',
    client_secret: 'BECPXqrRLqS2TmIbMSTeypvCYJUbVnVVXJSuiPUdaWNJQsPA3H6wLPbxyfeYvojG',
    client_id: '0oaakt1lskktHhFav5d7'
  });

  try {
    const response = await fetch('https://open-api.guesty.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestData
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    const newToken = data.access_token;
    console.log(newToken);
    updateToken(newToken)
    return newToken;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
}

async function updateToken(newToken){
    await updateDoc(tokenRef, {token: newToken, date:  dateFormatted(new Date())});
}

async function userExists(username) {
  const querySnapshot = await getDocs(collection(db, "Users"));
  for (const userDoc of querySnapshot.docs) {
    if (userDoc.data().email === username) {
      return userDoc.data().token; // Successfully hashed and updated
    }
  }
  return false; // User with the given email not found
}


// =========== APIs - WEBSITE =========== //

app.get('/api/getCurrentToken', async (req, res) => {
    const token = await getCurrentToken();
    res.json(token);
});
app.get('/api/getProperties', async (req, res) => {
    const token = await getCurrentToken();
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        timeout: '50000',
        authorization: 'Bearer ' + token
      }
    };
    fetch('https://open-api.guesty.com/v1/listings', options)
      .then(response => response.json())
      .then(response=> res.json(response))
});
app.post('/api/getCalendar', async (req, res) => {
    const token = await getCurrentToken();
    let todayte = new Date().toISOString().slice(0, 10);
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

    let { propertyID } = req.body;

    console.log(propertyID);
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        timeout: '50000',
        authorization: 'Bearer ' + token
      }
    };
    fetch('https://open-api.guesty.com/v1/availability-pricing/api/calendar/listings/'+ propertyID +'?startDate=' + todayte + '&endDate=' + nextYear, options)
      .then(response => response.json())
      .then(response=> res.json(response))
});
app.post('/api/getLastAvailability', async (req, res) => {
  const token = await getCurrentToken();
  let { propertyID, checkIn, checkOut} = req.body;

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      timeout: '50000',
      authorization: 'Bearer ' + token
    }
  };
  fetch("https://open-api.guesty.com/v1/availability-pricing/api/calendar/listings/" + propertyID + "?startDate=" + checkIn + "&endDate=" + checkOut, options)
    .then(response => response.json())
    .then(response=> res.json(response))
});
app.get('/api/getReservations', async (req, res) => {
  const token = await getCurrentToken();
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      timeout: '50000',
      authorization: 'Bearer ' + token
    }
  };
    fetch('https://open-api.guesty.com/v1/reservations?sort=checkIn&limit=100', options)
    .then(response => response.json())
    .then(response=> res.json(response))
});
app.post('/api/getTaxes', async (req, res) => {
  const token = await getCurrentToken();
  let { propertyID } = req.body;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      timeout: '50000',
      authorization: 'Bearer ' + token
    }
  };
  fetch('https://open-api.guesty.com/v1/taxes/unit-type/' + propertyID +'/actual', options)
    .then(response => response.json())
    .then(response=> res.json(response))
});
app.post('/api/newReservation', async (req, res) => {
  const token = await getCurrentToken();
  let reservationID = '';

  const { name, lastName, email, phone, checkIn, checkOut, propertyID, paid} = req.body; 

  function formatDateToYYYYMMDD(inputDate) {
    const dateComponents = inputDate.split('/');
    const year = dateComponents[0];
    const month = dateComponents[1].padStart(2, '0');
    const day = dateComponents[2].padStart(2, '0');
  
    return `${year}-${month}-${day}`;
  }

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      guest: {firstName:name, lastName:lastName, phone:phone, email:email},
      listingId: propertyID,
      checkInDateLocalized: formatDateToYYYYMMDD(checkIn),
      checkOutDateLocalized: formatDateToYYYYMMDD(checkOut),
      status: 'confirmed'
    })
  };

  const options2 = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: 'Bearer ' + token
    },
    body: JSON.stringify({paymentMethod: {method: 'CASH'}, amount: paid})
  };

  fetch('https://open-api.guesty.com/v1/reservations', options)
      .then(response => response.json())
      .then(response => {
        res.json(response.id)
        fetch('https://open-api.guesty.com/v1/reservations/'+ response.id +'/payments', options2)
      })
      .catch(err => console.error(err));
});
app.post("/api/login", async (req, res) => {
  res.json(await userExists(req.body.username));
});



// =========== APIs - DASHBOARD =========== //

app.get("/api/multipleCalendar", async (req,res)=>{
  const token = await getCurrentToken();
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Bearer ' + token
    }
  };
  let propertiesID = [
    {name: "The Pool House",     id:"638a965985cf74003f7b34e6"},
    {name: "Mariogold",          id:"627c1ef89d63b2003223d578"},
    {name: "Golfers Retreat",    id:"63670920fe8aa4007565c9d2"},
    {name: "The Lake House",     id:"63f03e1ce78efd003ec4d7de"},
    {name: "Sentinel",           id:"62a297f98d4ca500310bf165"},
    {name: "Oak Park Game Room", id:"643596e34613d0003620b962"},
    {name: "Landstrom",          id:"627c1f19b8ff0000368578ce"},
    {name: "Tuneberg",           id:"627c1f09c01e3a00346b803b"},
    {name: "Mario's Pad",        id:"6435af6b4613d0003623178c"},
    {name: "spidey",             id:"653d8f299c1bb10033a5f249"},
  ]
  let allIDs = '';
  for (let i = 0; i < propertiesID.length; i++) {
    i > 0 ? allIDs += "," + propertiesID[i].id : allIDs = propertiesID[i].id
  }

  const { start, end } = req.query;
  fetch('https://open-api.guesty.com/v1/availability-pricing/api/calendar/listings?listingIds=' + allIDs + '&startDate=' + start + '&endDate=' + end, options)
  .then(response => response.json())
  .then(response => {
    return res.status(200).json(response);
  })
  .catch(err => console.error(err));
});
app.get("/api/getAllCustomers", async (req,res)=>{
  const token = await getCurrentToken();
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Bearer ' + token
    }
  };
  fetch('https://open-api.guesty.com/v1/guests-crud?columns=fullName%20guestEmail%20guestPhone', options)
  .then(response => response.json())
  .then(response => {
    return res.status(200).json(response);
  })
  .catch(err => console.error(err));
});


// =========== APIs - DASHBOARD  BETTER EVENTS =========== //









// CONFIG - LOCAL SERVER

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


// 627c1f19b8ff0000368578ce