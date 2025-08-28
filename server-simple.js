// ONU Parts Tracker - Complete Server (No External Database Required)
// Runs entirely on Vercel with file-based storage

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const db = require('./lib/db.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'onu-parts-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files
const clientPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
}

// Email configuration
let emailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
  emailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ONU Parts Tracker is running', timestamp: new Date().toISOString() });
});

// Authentication
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.query('users', { username })[0];
  
  if (user && user.password === password) {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.name = user.name;
    req.session.role = user.role;
    res.json({ 
      id: user.id, 
      username: user.username, 
      name: user.name, 
      role: user.role 
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/current-user', (req, res) => {
  if (req.session.userId) {
    res.json({
      id: req.session.userId,
      username: req.session.username,
      name: req.session.name,
      role: req.session.role
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Parts management
app.get('/api/parts', requireAuth, (req, res) => {
  const parts = db.getAll('parts');
  res.json(parts);
});

app.post('/api/parts', requireAuth, (req, res) => {
  const part = db.insert('parts', {
    ...req.body,
    quantity: parseInt(req.body.quantity) || 0,
    reorderLevel: parseInt(req.body.reorderLevel) || 10
  });
  res.json(part);
});

app.put('/api/parts/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const updated = db.update('parts', id, req.body);
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Part not found' });
  }
});

app.delete('/api/parts/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  const deleted = db.delete('parts', id);
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Part not found' });
  }
});

// Low stock parts
app.get('/api/parts/low-stock', requireAuth, (req, res) => {
  const parts = db.getAll('parts');
  const lowStockParts = parts.filter(part => 
    (part.quantity || 0) <= (part.reorderLevel || 10)
  );
  res.json(lowStockParts);
});

// Buildings
app.get('/api/buildings', requireAuth, (req, res) => {
  const buildings = db.getAll('buildings');
  res.json(buildings);
});

app.post('/api/buildings', requireAuth, (req, res) => {
  const building = db.insert('buildings', req.body);
  res.json(building);
});

// Cost Centers
app.get('/api/cost-centers', requireAuth, (req, res) => {
  const costCenters = db.getAll('costCenters');
  res.json(costCenters);
});

app.post('/api/cost-centers', requireAuth, (req, res) => {
  const costCenter = db.insert('costCenters', req.body);
  res.json(costCenter);
});

// Staff Members
app.get('/api/staff', requireAuth, (req, res) => {
  const staff = db.getAll('staffMembers');
  res.json(staff);
});

app.post('/api/staff', requireAuth, (req, res) => {
  const staffMember = db.insert('staffMembers', req.body);
  res.json(staffMember);
});

// Parts Issuance
app.get('/api/parts-issuance', requireAuth, (req, res) => {
  const issuances = db.getAll('partsIssuance');
  res.json(issuances);
});

app.get('/api/parts-issuance/recent', requireAuth, (req, res) => {
  const issuances = db.getAll('partsIssuance');
  const recent = issuances
    .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
    .slice(0, 20);
  res.json(recent);
});

app.post('/api/parts-issuance', requireAuth, (req, res) => {
  const issuance = db.insert('partsIssuance', {
    ...req.body,
    issuedAt: new Date().toISOString(),
    issuedBy: req.session.userId
  });
  
  // Update part quantity
  const part = db.getById('parts', issuance.partId);
  if (part) {
    const newQuantity = Math.max(0, (part.quantity || 0) - issuance.quantity);
    db.update('parts', part.id, { quantity: newQuantity });
  }
  
  res.json(issuance);
});

// Parts Delivery with Email
app.post('/api/parts-delivery', requireAuth, async (req, res) => {
  const delivery = db.insert('partsDelivery', {
    ...req.body,
    deliveredAt: new Date().toISOString(),
    deliveredBy: req.session.userId,
    status: 'delivered'
  });

  // Send email receipt if configured
  if (emailTransporter && req.body.staffMemberEmail) {
    try {
      const part = db.getById('parts', delivery.partId);
      const staffMember = db.getById('staffMembers', delivery.staffMemberId);
      const building = db.getById('buildings', delivery.buildingId);
      const costCenter = db.getById('costCenters', delivery.costCenterId);

      const emailHtml = `
        <h2>Parts Delivery Receipt</h2>
        <p><strong>Delivered To:</strong> ${staffMember?.name || 'Unknown'}</p>
        <p><strong>Location:</strong> ${building?.name || 'Unknown'}</p>
        <p><strong>Cost Center:</strong> ${costCenter?.name || 'Unknown'} (${costCenter?.code || 'Unknown'})</p>
        <h3>Items Delivered:</h3>
        <ul>
          <li>${part?.name || 'Unknown Part'} - Quantity: ${delivery.quantity}</li>
        </ul>
        <p><strong>Delivered By:</strong> ${req.session.name}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><em>This is an automated receipt from the ONU Parts Tracker system.</em></p>
      `;

      await emailTransporter.sendMail({
        from: process.env.GMAIL_USER,
        to: req.body.staffMemberEmail,
        subject: 'Parts Delivery Receipt - ONU Parts Tracker',
        html: emailHtml
      });
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }

  res.json(delivery);
});

// Dashboard stats
app.get('/api/stats', requireAuth, (req, res) => {
  const parts = db.getAll('parts');
  const issuances = db.getAll('partsIssuance');
  
  const totalParts = parts.length;
  const totalPartsInStock = parts.reduce((sum, part) => sum + (part.quantity || 0), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyIssuances = issuances.filter(issue => {
    const issueDate = new Date(issue.issuedAt);
    return issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
  });
  const monthlyPartsIssuance = monthlyIssuances.reduce((sum, issue) => sum + (issue.quantity || 0), 0);
  
  const lowStockParts = parts.filter(part => (part.quantity || 0) <= (part.reorderLevel || 10));
  
  res.json({
    totalParts,
    totalPartsInStock,
    monthlyPartsIssuance,
    lowStockItemsCount: lowStockParts.length
  });
});

// Monthly usage data for charts
app.get('/api/parts-issuance/monthly-usage', requireAuth, (req, res) => {
  const issuances = db.getAll('partsIssuance');
  const monthlyData = {};
  
  issuances.forEach(issue => {
    const date = new Date(issue.issuedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (issue.quantity || 0);
  });
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const result = [];
  
  for (let i = 0; i < 12; i++) {
    const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    result.push({
      month: months[i],
      count: monthlyData[monthKey] || 0
    });
  }
  
  res.json(result.filter(item => item.count > 0));
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Please run npm run build:frontend');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ONU Parts Tracker running on port ${PORT}`);
  console.log(`📱 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
  if (emailTransporter) {
    console.log('📧 Email system configured');
  } else {
    console.log('📧 Email system not configured (set GMAIL_USER and GMAIL_PASSWORD)');
  }
});

module.exports = app;