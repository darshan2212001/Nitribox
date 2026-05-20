import express, { type Request, Response, NextFunction } from "express";
import http from 'http';
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mock API endpoints for frontend
app.get('/api/meal-plans', (req, res) => {
  res.json([
    {
      id: "1",
      title: "Weight Loss",
      description: "Balanced meals to help shed fat effectively",
      category: "weight_management",
      price: 1200,
      duration: 30,
      isActive: true
    },
    {
      id: "2", 
      title: "Muscle Gain",
      description: "High protein meals for muscle building",
      category: "fitness",
      price: 1500,
      duration: 30,
      isActive: true
    }
  ]);
});

app.get('/api/nutritionists', (req, res) => {
  res.json([
    {
      id: "1",
      name: "Dr. Priya Sharma",
      email: "priya.sharma@zyael.com",
      phone: "+91-9876543210",
      specialization: "Weight Management",
      experience: 8,
      rating: 4.8,
      isAvailable: true
    },
    {
      id: "2",
      name: "Dr. Rajesh Kumar", 
      email: "rajesh.kumar@zyael.com",
      phone: "+91-9876543211",
      specialization: "Sports Nutrition",
      experience: 12,
      rating: 4.9,
      isAvailable: true
    }
  ]);
});

app.get('/api/clients', (req, res) => {
  res.json([
    {
      id: "1",
      userId: "user-001",
      nutritionistId: "1",
      weightStart: 85.0,
      height: 170,
      age: 28,
      gender: "male",
      activityLevel: "moderate",
      goal: "weight_loss",
      dietaryRestrictions: ["vegetarian"],
      allergies: [],
      createdAt: new Date().toISOString()
    }
  ]);
});

app.get('/api/orders', (req, res) => {
  res.json([
    {
      id: "order-1",
      clientName: "Ananya Sharma",
      clientEmail: "ananya@example.com",
      clientPhone: "+91 98765 11111",
      mealPlan: "Weight Loss Plan",
      deliveryAddress: "123 Main St, Mumbai",
      status: "confirmed",
      kitchenStatus: "preparing",
      totalAmount: 1200,
      createdAt: new Date().toISOString()
    }
  ]);
});

app.get('/api/', (req, res) => {
  res.json({
    message: "ZyaeL NutriBox API",
    status: "running",
    database: {
      initialized: false,
      connected: false,
      error: "Database removed",
      meal_plans: 0,
      nutritionists: 0
    },
    environment: "development"
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// Setup Vite in development, serve static in production
import { WebSocketServer } from 'ws';

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.on('error', console.error);
  // Basic echo/broadcast server for the mock
  ws.on('message', (data, isBinary) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) { // 1 is WebSocket.OPEN
        client.send(data, { binary: isBinary });
      }
    });
  });
});

if (app.get("env") === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);
}

// Serve the app on port 5000
const port = parseInt(process.env.PORT || '5000', 10);
server.listen(port, "127.0.0.1", () => {
  log(`serving on port ${port}`);
});