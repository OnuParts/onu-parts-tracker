const express = require('express');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const WebSocketServer = require('ws').WebSocketServer;
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const multer = require('multer');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Session store
const PgSession = connectPgSimple(session);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'onu-parts-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session?.user) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      req.session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      };
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Current user endpoint
app.get('/api/current-user', requireAuth, (req, res) => {
  res.json(req.session.user);
});

// Parts endpoints
app.get('/api/parts', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, sl.name as location_name, s.name as shelf_name
      FROM parts p
      LEFT JOIN storage_locations sl ON p.location_id = sl.id
      LEFT JOIN shelves s ON p.shelf_id = s.id
      ORDER BY p.part_id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// Buildings endpoint
app.get('/api/buildings', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buildings WHERE active = true ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// Cost centers endpoint
app.get('/api/cost-centers', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cost_centers WHERE active = true ORDER BY code');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cost centers:', error);
    res.status(500).json({ error: 'Failed to fetch cost centers' });
  }
});

// Staff members endpoint
app.get('/api/staff', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, b.name as building_name, c.name as cost_center_name
      FROM staff_members s
      LEFT JOIN buildings b ON s.building_id = b.id
      LEFT JOIN cost_centers c ON s.cost_center_id = c.id
      WHERE s.active = true
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Parts delivery endpoints
app.get('/api/deliveries', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, p.name as part_name, p.part_id, s.name as staff_name, s.email as staff_email,
             b.name as building_name, c.name as cost_center_name, c.code as cost_center_code
      FROM parts_delivery d
      JOIN parts p ON d.part_id = p.id
      JOIN staff_members s ON d.staff_member_id = s.id
      LEFT JOIN buildings b ON d.building_id = b.id
      LEFT JOIN cost_centers c ON d.cost_center_id = c.id
      ORDER BY d.delivered_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Create delivery endpoint
app.post('/api/deliveries', requireAuth, async (req, res) => {
  try {
    const { partId, quantity, staffMemberId, costCenterId, buildingId, notes, projectCode } = req.body;
    
    // Get part details for unit cost
    const partResult = await pool.query('SELECT * FROM parts WHERE id = $1', [partId]);
    if (partResult.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    const part = partResult.rows[0];
    const unitCost = part.unit_cost;
    
    // Create delivery record
    const deliveryResult = await pool.query(`
      INSERT INTO parts_delivery (part_id, quantity, staff_member_id, cost_center_id, building_id, 
                                  delivered_by_id, notes, project_code, unit_cost, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `, [partId, quantity, staffMemberId, costCenterId, buildingId, req.session.user.id, notes, projectCode, unitCost]);
    
    // Update part quantity
    await pool.query('UPDATE parts SET quantity = quantity - $1 WHERE id = $2', [quantity, partId]);
    
    res.status(201).json(deliveryResult.rows[0]);
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ error: 'Failed to create delivery' });
  }
});

// Confirm delivery endpoint (for email sending)
app.put('/api/deliveries/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { signature } = req.body;
    
    // Update delivery status and add signature
    const result = await pool.query(`
      UPDATE parts_delivery 
      SET status = 'delivered', confirmed_at = NOW(), signature = $1
      WHERE id = $2
      RETURNING *
    `, [signature, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    const delivery = result.rows[0];
    
    // Get full delivery details for email
    const detailsResult = await pool.query(`
      SELECT d.*, p.name as part_name, p.part_id, s.name as staff_name, s.email as staff_email,
             b.name as building_name, c.name as cost_center_name, c.code as cost_center_code
      FROM parts_delivery d
      JOIN parts p ON d.part_id = p.id
      JOIN staff_members s ON d.staff_member_id = s.id
      LEFT JOIN buildings b ON d.building_id = b.id
      LEFT JOIN cost_centers c ON d.cost_center_id = c.id
      WHERE d.id = $1
    `, [id]);
    
    const deliveryDetails = detailsResult.rows[0];
    
    // Send email receipt
    if (deliveryDetails.staff_email) {
      await sendDeliveryEmail(deliveryDetails);
    }
    
    res.json(deliveryDetails);
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ error: 'Failed to confirm delivery' });
  }
});

// Email function for delivery receipts
async function sendDeliveryEmail(delivery) {
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.GMAIL_PASSWORD
      }
    });

    const unitCost = parseFloat(delivery.unit_cost) || 0;
    const totalCost = unitCost * delivery.quantity;
    
    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Parts Delivery Receipt</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
            <h1 style="color: #003366; text-align: center;">🎯 ONU Parts Tracker</h1>
            <h2 style="color: #003366; text-align: center;">Parts Delivery Receipt</h2>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>📋 Delivery Details</h3>
              <p><strong>Recipient:</strong> ${delivery.staff_name}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Building:</strong> ${delivery.building_name || 'N/A'}</p>
              <p><strong>Cost Center:</strong> ${delivery.cost_center_name || 'N/A'}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Part</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Quantity</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Unit Cost</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${delivery.part_name}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${delivery.quantity}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${unitCost.toFixed(2)}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${totalCost.toFixed(2)}</td>
                </tr>
                <tr style="background: #fff3cd; font-weight: bold;">
                  <td colspan="3" style="padding: 12px; border-top: 2px solid #ffc107; text-align: right;"><strong>Grand Total:</strong></td>
                  <td style="padding: 12px; border-top: 2px solid #ffc107; text-align: right;"><strong>$${totalCost.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0;"><strong>📧 Automated Email Receipt</strong></p>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                This is an automated confirmation of your parts delivery. For questions, contact the Parts Management team.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee;">
              <p>Ohio Northern University - Parts Management System</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"ONU Parts Tracker" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: delivery.staff_email,
      subject: `Parts Delivery Receipt - ${delivery.part_name}`,
      html: emailContent,
      text: `Parts Delivery Receipt: ${delivery.part_name} (Qty: ${delivery.quantity}) delivered to ${delivery.staff_name}. Total: $${totalCost.toFixed(2)}`
    });
    
    console.log(`✅ Email sent to ${delivery.staff_email} for delivery ${delivery.id}`);
    
  } catch (error) {
    console.error('Email sending error:', error);
  }
}

// Stats endpoint
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const [partsCount, lowStockCount, monthlyIssuance] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM parts'),
      pool.query('SELECT COUNT(*) as count FROM parts WHERE quantity <= reorder_level'),
      pool.query(`SELECT COUNT(*) as count FROM parts_issuance 
                  WHERE issued_at >= date_trunc('month', CURRENT_DATE)`)
    ]);
    
    const totalPartsInStock = await pool.query('SELECT SUM(quantity) as total FROM parts');
    
    res.json({
      totalParts: parseInt(partsCount.rows[0].count),
      totalPartsInStock: parseInt(totalPartsInStock.rows[0].total) || 0,
      lowStockItemsCount: parseInt(lowStockCount.rows[0].count),
      monthlyPartsIssuance: parseInt(monthlyIssuance.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Low stock parts endpoint
app.get('/api/parts/low-stock', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM parts 
      WHERE quantity <= reorder_level 
      ORDER BY quantity ASC 
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching low stock parts:', error);
    res.status(500).json({ error: 'Failed to fetch low stock parts' });
  }
});

// Recent parts issuance endpoint
app.get('/api/parts-issuance/recent', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pi.*, p.name as part_name, p.part_id, u.name as issued_by_name
      FROM parts_issuance pi
      JOIN parts p ON pi.part_id = p.id
      LEFT JOIN users u ON pi.issued_by = u.id
      ORDER BY pi.issued_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent issuance:', error);
    res.status(500).json({ error: 'Failed to fetch recent issuance' });
  }
});

// Monthly usage data endpoint
app.get('/api/parts-issuance/monthly-usage', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        to_char(issued_at, 'Mon') as month,
        COUNT(*) as count
      FROM parts_issuance 
      WHERE issued_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY to_char(issued_at, 'Mon'), date_trunc('month', issued_at)
      ORDER BY date_trunc('month', issued_at)
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching monthly usage:', error);
    res.status(500).json({ error: 'Failed to fetch monthly usage' });
  }
});

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Create HTTP server
const httpServer = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (socket) => {
  console.log('WebSocket client connected');
  
  socket.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to ONU Parts Tracker websocket server' 
  }));
  
  socket.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
  
  socket.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ONU Parts Tracker server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔗 WebSocket server running on ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});