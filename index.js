const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, updateDoc } = require("firebase/firestore");
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


// Define a sample route
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
      guest: {firstName: name , lastName, phone: phone, email: email},
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
        fetch('https://open-api.guesty.com/v1/reservations/'+ response.id +'/payments', options2)
      })
      .catch(err => console.error(err));
});



// =======  RESERVATIONS  ======= //


app.get('/api/getBookedDays', async (req, res) => {
  const token = await getCurrentToken();
  const listingId = '638a965985cf74003f7b34e6'; 
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      timeout: '50000',
      authorization: 'Bearer ' + token
    }
  };

let myReservations = []
  fetch(`https://open-api.guesty.com/v1/reservations?&sort=checkIn&limit=100`, options)
    .then(response => response.json())
    .then(response => {
      const reservations = response.results;
      reservations.forEach((reservation) => {
        if(reservation.listingId == listingId){
          // console.log(reservation.checkIn, reservation.checkOut);
          myReservations.push(reservation.checkIn, reservation.checkOut);
        }

      });
      res.json(myReservations)
    })

    
   
});




// =========== DASHBOARD ============== //

app.get("/api/multipleCalendar", async (req,res)=>{
  const token = await getCurrentToken();
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: 'Bearer ' + token
    }
  };
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


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
// 627c1f19b8ff0000368578ce