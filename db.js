// ============================================================
//  db.js — Vellfire Holidays | Data Layer
//  Firebase v8 compat | No ES modules
// ============================================================
//
//  HOW IT WORKS:
//  ─────────────
//  Public pages (index, tours, cars, book, contact, gallery)
//    Load: firebase-app.js + firebase-firestore.js only
//    Do:   Read tours/cars/reviews, submit bookings
//    Auth: NOT needed
//
//  Admin page only (admin.html)
//    Loads: firebase-app.js + firebase-auth.js + firebase-firestore.js
//    Does:  Full CRUD on all collections
//    Auth:  Required — signs in with email/password
//
// ============================================================

// ── Firebase Init ─────────────────────────────────────────────
var FB_READY = (
  typeof firebaseConfig !== 'undefined' &&
  typeof firebaseConfig.projectId === 'string' &&
  firebaseConfig.projectId.indexOf('PASTE') === -1 &&
  firebaseConfig.projectId.length > 0
);

var db   = null;
var auth = null;

if (FB_READY) {
  try {
    try { firebase.initializeApp(firebaseConfig); } catch(ignoreAlreadyInit) {}
    db = firebase.firestore();
    // firebase.auth() only exists if firebase-auth.js was loaded (admin.html only)
    if (typeof firebase.auth === 'function') {
      auth = firebase.auth();
    }
    console.log('%c[Vellfire] Firebase ready → ' + firebaseConfig.projectId, 'color:#20875a;font-weight:bold');
  } catch(e) {
    console.error('[Vellfire] Firebase init error:', e.message);
    db = null; auth = null;
  }
} else {
  console.warn('[Vellfire] Firebase not configured — localStorage mode');
}

// ── Collections ───────────────────────────────────────────────
var C_TOURS    = 'tours';
var C_CARS     = 'cars';
var C_REVIEWS  = 'reviews';
var C_BOOKINGS = 'bookings';

// ── Helpers ───────────────────────────────────────────────────
function vfUID() { return 'vf_' + Date.now() + '_' + Math.floor(Math.random() * 99999); }

function lsGet(k, d) {
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }

// ── Default data (shown when Firestore is empty or unreachable) ──
var DEFAULT_TOURS = [
  { id:'t1', title:'Gulmarg Tour', duration:'2 Days / 1 Night', price:3499, originalPrice:4500,
    category:'Adventure', image:'https://images.unsplash.com/photo-1551632811-561732d1e306?w=700&q=80',
    description:'Experience the world-famous ski resort and Gondola ride at Gulmarg — a winter wonderland and summer paradise.',
    inclusions:['Transport','Hotel','Breakfast','Gondola Ticket','Guide'], featured:true, _order:0 },
  { id:'t2', title:'Pahalgam Tour', duration:'2 Days / 1 Night', price:3999, originalPrice:5000,
    category:'Nature', image:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80',
    description:'Explore the Valley of Shepherds — Lidder River, Baisaran meadows and pine forests of Pahalgam.',
    inclusions:['Transport','Hotel','Meals','Baisaran Visit','Guide'], featured:true, _order:1 },
  { id:'t3', title:'Sonamarg Tour', duration:'1 Day / Day Trip', price:2499, originalPrice:3200,
    category:'Adventure', image:'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=700&q=80',
    description:'The Meadow of Gold — glaciers, snow bridges and the iconic Thajiwas glacier pony ride.',
    inclusions:['Transport','Lunch','Glacier Visit','Guide'], featured:true, _order:2 },
  { id:'t4', title:'Full Kashmir Package', duration:'7 Days / 6 Nights', price:18999, originalPrice:24000,
    category:'Complete', image:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80',
    description:'Complete Kashmir experience — Dal Lake, Gulmarg, Pahalgam, Sonamarg, Mughal Gardens & more.',
    inclusions:['Houseboat Stay','Hotels','All Meals','All Sightseeing','Airport Transfers','Dedicated Guide'],
    featured:true, _order:3 }
];
var DEFAULT_CARS = [
  { id:'c1', name:'Innova', seats:'7 Seater', price:'₹2,500/day',
    image:'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=700&q=80',
    description:'Comfortable and spacious Toyota Innova — ideal for family trips and mountain tours.',
    features:['AC','7 Seats','Music System','Experienced Driver'], _order:0 },
  { id:'c2', name:'Innova Crysta', seats:'7 Seater', price:'₹3,200/day',
    image:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=700&q=80',
    description:'Premium Toyota Innova Crysta with superior comfort for a luxurious Kashmir travel experience.',
    features:['AC','7 Seats','Premium Interior','Sunshade','Expert Driver'], _order:1 },
  { id:'c3', name:'Tempo Traveller', seats:'12 Seater', price:'₹4,800/day',
    image:'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&q=80',
    description:'Perfect for group tours — spacious Tempo Traveller with push-back seats and ample luggage space.',
    features:['AC','12 Seats','Push-back Seats','Luggage Space','Driver'], _order:2 },
  { id:'c4', name:'Sedan', seats:'4 Seater', price:'₹1,800/day',
    image:'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=700&q=80',
    description:'Budget-friendly sedan for couples and solo travelers — clean, comfortable and reliable.',
    features:['AC','4 Seats','Music System','Driver'], _order:3 }
];
var DEFAULT_REVIEWS = [
  { id:'r1', name:'Aditya Verma', location:'New Delhi', rating:5,
    text:'Vellfire Holidays gave us the best Kashmir experience! Shaiq bhai arranged everything perfectly — houseboat, Gulmarg, Pahalgam. Will recommend to all!', _order:0 },
  { id:'r2', name:'Priya & Rohit', location:'Mumbai', rating:5,
    text:'Booked the Full Kashmir Package for our honeymoon. The Innova Crysta was spotless and our guide was incredibly knowledgeable. Thank you Vellfire!', _order:1 },
  { id:'r3', name:'Sharma Family', location:'Bangalore', rating:5,
    text:'Traveled with family of 6 in the Tempo Traveller. Kids loved the snow in Gulmarg and Sonamarg. Excellent service throughout the trip!', _order:2 }
];

// ═══════════════════════════════════════════════════════════════
//  READ — Public (no auth)
//  Used by: index.html, tours.html, cars.html
// ═══════════════════════════════════════════════════════════════

function vfGetAll(col, lsKey, def) {
  if (!db) {
    var cached = lsGet(lsKey, null);
    return Promise.resolve((cached && cached.length) ? cached : def);
  }
  return db.collection(col).orderBy('_order', 'asc').get()
    .then(function(snap) {
      if (snap.empty) {
        var cached = lsGet(lsKey, null);
        return (cached && cached.length) ? cached : def;
      }
      var docs = snap.docs.map(function(d) { return d.data(); });
      lsSet(lsKey, docs);
      return docs;
    })
    .catch(function(e) {
      console.warn('[Vellfire] Read error (' + col + '):', e.message);
      var cached = lsGet(lsKey, null);
      return (cached && cached.length) ? cached : def;
    });
}

function vfGetTours()   { return vfGetAll(C_TOURS,   'vf_tours',   DEFAULT_TOURS);   }
function vfGetCars()    { return vfGetAll(C_CARS,    'vf_cars',    DEFAULT_CARS);    }
function vfGetReviews() { return vfGetAll(C_REVIEWS, 'vf_reviews', DEFAULT_REVIEWS); }

// ═══════════════════════════════════════════════════════════════
//  BOOKINGS — Public create, Admin read/delete
// ═══════════════════════════════════════════════════════════════

function vfSaveBooking(obj) {
  obj.id             = vfUID();
  obj._ts            = Date.now();
  obj.date_submitted = new Date().toLocaleDateString('en-IN',
    { day:'2-digit', month:'short', year:'numeric' });

  if (!db) {
    var arr = lsGet('vf_bookings', []);
    arr.push(obj);
    lsSet('vf_bookings', arr);
    return Promise.resolve(obj);
  }
  return db.collection(C_BOOKINGS).doc(obj.id).set(obj)
    .then(function() { return obj; })
    .catch(function(e) {
      console.warn('[Vellfire] Booking save error:', e.message);
      var arr = lsGet('vf_bookings', []);
      arr.push(obj);
      lsSet('vf_bookings', arr);
      return obj;
    });
}

function vfGetBookings() {
  if (!db) return Promise.resolve(lsGet('vf_bookings', []));
  return db.collection(C_BOOKINGS).orderBy('_ts', 'desc').get()
    .then(function(snap) { return snap.docs.map(function(d) { return d.data(); }); })
    .catch(function(e) {
      console.warn('[Vellfire] Bookings read error:', e.message);
      return lsGet('vf_bookings', []);
    });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN AUTH — admin.html only
//  Requires firebase-auth.js to be loaded before db.js
// ═══════════════════════════════════════════════════════════════

function vfAdminLogin(email, password) {
  if (!auth) return Promise.reject(new Error('Auth SDK not loaded'));
  return auth.signInWithEmailAndPassword(email, password);
}

function vfAdminLogout() {
  if (!auth) return Promise.resolve();
  return auth.signOut();
}

function vfCurrentUser() {
  return (auth && auth.currentUser) ? auth.currentUser : null;
}

// Calls callback(user) once auth state is known — used in admin.html on load
function vfOnAuthReady(callback) {
  if (!auth) { callback(null); return; }
  var unsub = auth.onAuthStateChanged(function(user) {
    unsub();
    callback(user);
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN WRITE — admin.html only (Firestore rules enforce auth)
// ═══════════════════════════════════════════════════════════════

function vfSave(col, lsKey, obj, isNew) {
  var id = obj.id || vfUID();
  obj.id = id;
  obj._ts = Date.now();

  // localStorage fallback
  if (!db) {
    var arr = lsGet(lsKey, []);
    var found = false;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { arr[i] = Object.assign({}, arr[i], obj); found = true; break; }
    }
    if (!found) { obj._order = arr.length; arr.push(obj); }
    lsSet(lsKey, arr);
    return Promise.resolve(obj);
  }

  var ref = db.collection(col).doc(id);

  if (isNew) {
    return db.collection(col).get()
      .then(function(snap) { obj._order = snap.size; return ref.set(obj); })
      .then(function() {
        var cached = lsGet(lsKey, []); cached.push(obj); lsSet(lsKey, cached);
        return obj;
      });
  }

  // Update — only change fields provided, keep everything else intact
  var payload = {};
  var keys = Object.keys(obj);
  for (var k = 0; k < keys.length; k++) {
    if (obj[keys[k]] !== undefined) payload[keys[k]] = obj[keys[k]];
  }

  return ref.update(payload)
    .then(function() {
      var cached = lsGet(lsKey, []);
      for (var ci = 0; ci < cached.length; ci++) {
        if (cached[ci].id === id) { cached[ci] = Object.assign({}, cached[ci], payload); break; }
      }
      lsSet(lsKey, cached);
      return payload;
    });
}

function vfSaveTour(obj, isNew)   { return vfSave(C_TOURS,   'vf_tours',   obj, isNew); }
function vfSaveCar(obj, isNew)    { return vfSave(C_CARS,    'vf_cars',    obj, isNew); }
function vfSaveReview(obj, isNew) { return vfSave(C_REVIEWS, 'vf_reviews', obj, isNew); }

function vfDelete(col, lsKey, id) {
  var removeFromCache = function() {
    var arr = lsGet(lsKey, []);
    var filtered = [];
    for (var i = 0; i < arr.length; i++) { if (arr[i].id !== id) filtered.push(arr[i]); }
    lsSet(lsKey, filtered);
  };
  if (!db) { removeFromCache(); return Promise.resolve(); }
  return db.collection(col).doc(id).delete().then(removeFromCache);
}

function vfDeleteTour(id)    { return vfDelete(C_TOURS,    'vf_tours',    id); }
function vfDeleteCar(id)     { return vfDelete(C_CARS,     'vf_cars',     id); }
function vfDeleteReview(id)  { return vfDelete(C_REVIEWS,  'vf_reviews',  id); }
function vfDeleteBooking(id) { return vfDelete(C_BOOKINGS, 'vf_bookings', id); }

// ── One-time seed — admin Dashboard only ─────────────────────
// Only writes if collection is completely empty. Never overwrites.
function vfSeedIfEmpty(col, def) {
  if (!db) return Promise.reject(new Error('Firebase not configured'));
  return db.collection(col).limit(1).get()
    .then(function(snap) {
      if (!snap.empty) {
        console.log('[Vellfire] Seed skipped — ' + col + ' already has data');
        return 'skipped';
      }
      var batch = db.batch();
      for (var i = 0; i < def.length; i++) {
        var d = Object.assign({}, def[i], { _order: i, _ts: Date.now() });
        batch.set(db.collection(col).doc(def[i].id), d);
      }
      return batch.commit().then(function() {
        console.log('[Vellfire] Seeded ' + def.length + ' docs → ' + col);
        return 'seeded';
      });
    });
}
