const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MANAGER_EMAIL = process.env.MANAGER_EMAIL || 'manager@cihoshelounge.co.za';
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'cihoshe123';
const SESSION_COOKIE_NAME = 'manager_session';
const SESSION_TTL = 1000 * 60 * 60 * 8;
let pool;

function issueSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

const managerSessions = new Map();

function requireManager(req, res, next) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = cookie ? cookie.split('=')[1] : null;
  if (!token || !managerSessions.has(token)) {
    return res.status(401).json({ error: 'Manager access required.' });
  }

  const session = managerSessions.get(token);
  if (Date.now() > session.expiresAt) {
    managerSessions.delete(token);
    return res.status(401).json({ error: 'Manager session expired.' });
  }

  req.manager = session;
  next();
}

function validateReservationRequest(dateString, timeString) {
  if (!dateString || !timeString) {
    return { valid: false, error: 'Please complete all reservation fields.' };
  }

  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: 'Please choose a valid reservation date.' };
  }

  const day = date.getDay();
  const isOpenDay = day === 2 || day === 3 || day === 4 || day === 5 || day === 6 || day === 0;
  if (!isOpenDay) {
    return { valid: false, error: 'Reservations are available from Tuesday to Sunday only.' };
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeString);
  if (!match) {
    return { valid: false, error: 'Please choose a valid reservation time.' };
  }

  const [hours, minutes] = match.slice(1).map(Number);
  const totalMinutes = (hours * 60) + minutes;
  const openingMinutes = 12 * 60;
  const closingMinutes = 22 * 60;

  if (totalMinutes < openingMinutes || totalMinutes > closingMinutes) {
    return { valid: false, error: 'Reservations are available between 12:00 and 22:00.' };
  }

  return { valid: true };
}

async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cihoshe_lounge',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    await pool.query('SELECT 1');
    console.log('MySQL connected.');
  } catch (err) {
    pool = null;
    console.warn('MySQL is not connected. The site will run in demo mode.');
    console.warn(err.message);
  }
}

app.use(express.json());
// In Vercel, __dirname points to /api, so we need to adjust
const rootDir = process.env.VERCEL ? path.join(__dirname, '..') : __dirname;
app.use(express.static(rootDir));
app.use(express.static(path.join(rootDir, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/api/admin/session', requireManager, (req,res) => {
  res.json({ authenticated: true, user: req.manager.username });
});

app.post('/api/admin/login', (req,res) => {
  const { username, password } = req.body || {};
  if (username !== MANAGER_EMAIL || password !== MANAGER_PASSWORD) {
    return res.status(401).json({ error: 'Invalid manager email or password.' });
  }

  const token = issueSessionToken();
  managerSessions.set(token, { username: MANAGER_EMAIL, expiresAt: Date.now() + SESSION_TTL });

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: SESSION_TTL
  });

  return res.json({ message: 'Manager login successful.' });
});

app.post('/api/admin/logout', (req,res) => {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = cookie ? cookie.split('=')[1] : null;
  if (token) managerSessions.delete(token);
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ message: 'Logged out.' });
});

const demoMenu = [
  {ItemID:1,Name:'Umngqusho Supreme',Description:'Creamed white maize and butter beans infused with truffle oil, crispy sage and aged balsamic.',Price:320,Category:'Signature',ImageURL:'/images/umngqusho.jpg'},
  {ItemID:2,Name:'Pan-Seared Kingklip with Umfino',Description:'Wild-caught kingklip with sautéed indigenous spinach, coconut cream and amaranth crust.',Price:380,Category:'Seafood',ImageURL:'https://images.unsplash.com/photo-1580959375944-abd7e991f971?auto=format&fit=crop&w=1000&q=80'},
  {ItemID:3,Name:'Sosatie Skewers',Description:'Marinated lamb cubes with apricot glaze, roasted onion and traditional spice dust.',Price:340,Category:'Signature',ImageURL:'/images/sosaties.jpg'},
  {ItemID:4,Name:'Sorghum-Crusted Duck Breast',Description:'Pan-roasted duck breast with sorghum flour crust, spiced beetroot purée and microgreens.',Price:395,Category:'Signature',ImageURL:'/images/duck-breast.jpg'},
  {ItemID:5,Name:'Mogodu Elegante',Description:'Slow-cooked tripe with tomato compote, ginger, traditional Xhosa spices and polenta base.',Price:280,Category:'Heritage',ImageURL:'/images/mogodu.jpg'},
  {ItemID:6,Name:'Braised Lamb Neck with Heritage Herbs',Description:'Tender 12-hour braised lamb neck, root vegetable medley, thyme and African mint sauce.',Price:360,Category:'Signature',ImageURL:'/images/lamb-neck.jpg'},
  {ItemID:7,Name:'Refined Bunny Chow',Description:'Artisanal sourdough hollowed and filled with spiced vegetable curry, pickled onion and cilantro.',Price:240,Category:'Heritage',ImageURL:'/images/bunny-chow.jpg'},
  {ItemID:8,Name:'Sorghum Flour Pudding',Description:'Baked sorghum flour pudding with caramelized banana, spiced honey and vanilla cream.',Price:110,Category:'Dessert',ImageURL:'/images/sorghum-pudding.jpg'},
  {ItemID:9,Name:'Malva Pudding',Description:'Traditional warm malva pudding with vanilla custard, toasted nuts and salted caramel.',Price:95,Category:'Dessert',ImageURL:'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1000&q=80'},
  {ItemID:10,Name:'Rooibos & Honey Tart',Description:'Crispy pastry tart with rooibos-infused custard, honeycomb and edible flowers.',Price:120,Category:'Dessert',ImageURL:'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=1000&q=80'},
  {ItemID:11,Name:'Ginger Beer',Description:'Sparkling house ginger beer with fresh ginger, lemon and a gentle touch of honey.',Price:65,Category:'Beverage',ImageURL:'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=80'},
  {ItemID:12,Name:'Rooibos Citrus Infusion',Description:'Chilled rooibos with fresh citrus, mint, ginger and seasonal berries.',Price:65,Category:'Beverage',ImageURL:'/images/rooibos-citrus-cooler.jpg'}
];
let demoReservations = [];
let demoFeedback = [];

app.get('/api/health', (req,res)=>res.json({ok:true,database:!!pool}));

app.get('/api/menu', async (req,res)=>{
  try {
    if (!pool) return res.json(demoMenu);
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE is_available=1 ORDER BY Category, Name');
    res.json(rows);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/reservations', async (req,res)=>{
  const {name,email,phone,date,time,partySize} = req.body;
  if(!name||!email||!phone||!date||!time||!partySize) return res.status(400).json({error:'Please complete all reservation fields.'});

  const validation = validateReservationRequest(date, time);
  if (!validation.valid) return res.status(400).json({ error: validation.error });

  try {
    if (!pool) {
      const id = demoReservations.length + 1;
      demoReservations.push({ReservationID:id,Name:name,Email:email,Phone:phone,Date:date,Time:time,PartySize:partySize,status:'Pending'});
      return res.json({message:'Reservation request received.',reservationId:id,demo:true});
    }
    const [existing] = await pool.query('SELECT CustomerID FROM customers WHERE Email=?',[email]);
    let customerId;
    if(existing.length) {
      customerId=existing[0].CustomerID;
      await pool.query('UPDATE customers SET Name=?, Phone=? WHERE CustomerID=?',[name,phone,customerId]);
    } else {
      const [r] = await pool.query('INSERT INTO customers (Name,Email,Phone) VALUES (?,?,?)',[name,email,phone]);
      customerId=r.insertId;
    }
    const [r] = await pool.query('INSERT INTO reservations (CustomerID,Date,Time,PartySize) VALUES (?,?,?,?)',[customerId,date,time,partySize]);
    res.json({message:'Reservation request received.',reservationId:r.insertId});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post('/api/feedback', async (req,res)=>{
  const {name,email,rating,comments} = req.body;
  if(!name||!email||!rating||!comments) return res.status(400).json({error:'Please complete all feedback fields.'});
  try {
    if (!pool) {
      demoFeedback.push({name,email,rating,comments,date:new Date().toISOString()});
      return res.json({message:'Thank you. Your feedback has been received.',demo:true});
    }
    const [existing] = await pool.query('SELECT CustomerID FROM customers WHERE Email=?',[email]);
    let customerId;
    if(existing.length) customerId=existing[0].CustomerID;
    else { const [r]=await pool.query('INSERT INTO customers (Name,Email,Phone) VALUES (?,?,?)',[name,email,'']); customerId=r.insertId; }
    await pool.query('INSERT INTO feedback (CustomerID,Rating,Comments) VALUES (?,?,?)',[customerId,rating,comments]);
    res.json({message:'Thank you. Your feedback has been received.'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/admin/summary', requireManager, async (req,res)=>{
  try {
    if(!pool) return res.json({reservations:demoReservations.length,feedback:demoFeedback.length,menu:demoMenu.length,orders:0,mode:'Demo'});
    const [[r]] = await pool.query('SELECT COUNT(*) reservations FROM reservations');
    const [[f]] = await pool.query('SELECT COUNT(*) feedback FROM feedback');
    const [[m]] = await pool.query('SELECT COUNT(*) menu FROM menu_items WHERE is_available=1');
    const [[o]] = await pool.query('SELECT COUNT(*) orders FROM orders');
    res.json({reservations:r.reservations,feedback:f.feedback,menu:m.menu,orders:o.orders,mode:'MySQL'});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/admin/reservations', requireManager, async (req,res)=>{
  try {
    if(!pool) return res.json(demoReservations);
    const [rows]=await pool.query(`SELECT r.ReservationID,r.Date,r.Time,r.PartySize,r.status,c.Name,c.Email,c.Phone FROM reservations r JOIN customers c ON c.CustomerID=r.CustomerID ORDER BY r.Date DESC,r.Time DESC`);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

if (require.main === module) {
  app.listen(PORT, async()=>{ console.log(`Cihoshe Lounge running at http://localhost:${PORT}`); await initDb(); });
}

module.exports = { app, validateReservationRequest, initDb };
