#!/usr/bin/env python3
"""
ZyaeL NutriBox Real-Time Subscription Nutrition Ecosystem Startup Script
Initializes and starts all components of the nutrition ecosystem
"""

import asyncio
import subprocess
import sys
import time
import os
from pathlib import Path
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class NutriBoxEcosystemManager:
    """Manages the complete ZyaeL NutriBox ecosystem startup and health checks"""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.processes: Dict[str, subprocess.Popen] = {}
        self.services = {
            "api_server": {
                "command": ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                "cwd": self.base_dir,  # Project root, not api/ subdirectory
                "health_check": "http://localhost:8000/api/health",
                "description": "FastAPI Backend Server"
            },
            "client_dev": {
                "command": ["npm", "run", "dev"],
                "cwd": self.base_dir / "client",
                "health_check": "http://localhost:3000",
                "description": "React Client Development Server"
            },
            "mobile_dev": {
                "command": ["npm", "run", "android"],
                "cwd": self.base_dir / "mobile",
                "health_check": None,  # Mobile doesn't have HTTP health check
                "description": "React Native Mobile App"
            }
        }
    
    async def start_ecosystem(self):
        """Start the complete nutrition ecosystem"""
        logger.info("🚀 Starting ZyaeL NutriBox Real-Time Subscription Nutrition Ecosystem")
        logger.info("="*70)
        
        # Check prerequisites
        await self.check_prerequisites()
        
        # Start services
        await self.start_services()
        
        # Wait for services to be ready
        await self.wait_for_services()
        
        # Run health checks
        await self.run_health_checks()
        
        # Display ecosystem status
        self.display_ecosystem_status()
        
        logger.info("✅ ZyaeL NutriBox Ecosystem is now running!")
        logger.info("="*70)
    
    async def check_prerequisites(self):
        """Check if all prerequisites are met"""
        logger.info("🔍 Checking prerequisites...")
        
        # Check Python version
        python_version = sys.version_info
        if python_version < (3, 8):
            logger.error("❌ Python 3.8+ is required")
            sys.exit(1)
        logger.info(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        # Check Node.js version
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"✅ Node.js {result.stdout.strip()}")
            else:
                logger.error("❌ Node.js is not installed")
                sys.exit(1)
        except FileNotFoundError:
            logger.error("❌ Node.js is not installed")
            sys.exit(1)
        
        # Check npm version
        try:
            result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"✅ npm {result.stdout.strip()}")
            else:
                logger.error("❌ npm is not installed")
                sys.exit(1)
        except FileNotFoundError:
            logger.error("❌ npm is not installed")
            sys.exit(1)
        
        # Check if required directories exist
        required_dirs = ["api", "client", "mobile"]
        for dir_name in required_dirs:
            dir_path = self.base_dir / dir_name
            if dir_path.exists():
                logger.info(f"✅ {dir_name}/ directory exists")
            else:
                logger.error(f"❌ {dir_name}/ directory not found")
                sys.exit(1)
        
        logger.info("✅ All prerequisites met!")
    
    async def start_services(self):
        """Start all ecosystem services"""
        logger.info("🚀 Starting ecosystem services...")
        
        # Start API server first
        await self.start_service("api_server")
        await asyncio.sleep(3)  # Give API server time to start
        
        # Start client development server
        await self.start_service("client_dev")
        await asyncio.sleep(2)
        
        # Start mobile app (optional, as it requires Android Studio/emulator)
        try:
            await self.start_service("mobile_dev")
        except Exception as e:
            logger.warning(f"⚠️ Mobile app not started: {e}")
            logger.info("💡 To start mobile app: cd mobile && npm run android")
        
        logger.info("✅ All services started!")
    
    async def start_service(self, service_name: str):
        """Start a specific service"""
        service_config = self.services[service_name]
        
        logger.info(f"🔄 Starting {service_config['description']}...")
        
        try:
            process = subprocess.Popen(
                service_config["command"],
                cwd=service_config["cwd"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.processes[service_name] = process
            logger.info(f"✅ {service_config['description']} started (PID: {process.pid})")
            
        except Exception as e:
            logger.error(f"❌ Failed to start {service_config['description']}: {e}")
            raise
    
    async def wait_for_services(self):
        """Wait for services to be ready"""
        logger.info("⏳ Waiting for services to be ready...")
        
        for service_name, service_config in self.services.items():
            if service_name not in self.processes:
                continue
                
            health_check = service_config.get("health_check")
            if not health_check:
                continue
            
            logger.info(f"🔍 Checking {service_config['description']}...")
            
            # Wait for service to be ready (simple HTTP check)
            max_attempts = 30
            for attempt in range(max_attempts):
                try:
                    import aiohttp
                    async with aiohttp.ClientSession() as session:
                        async with session.get(health_check, timeout=5) as response:
                            if response.status == 200:
                                logger.info(f"✅ {service_config['description']} is ready!")
                                break
                except Exception:
                    pass
                
                await asyncio.sleep(2)
            else:
                logger.warning(f"⚠️ {service_config['description']} may not be ready yet")
    
    async def run_health_checks(self):
        """Run comprehensive health checks"""
        logger.info("🏥 Running ecosystem health checks...")
        
        health_checks = [
            ("API Server", "http://localhost:8000/api/health"),
            ("Monitoring Dashboard", "http://localhost:8000/api/monitoring/health"),
            ("Client Portal", "http://localhost:3000"),
        ]
        
        for check_name, url in health_checks:
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=10) as response:
                        if response.status == 200:
                            logger.info(f"✅ {check_name}: Healthy")
                        else:
                            logger.warning(f"⚠️ {check_name}: Status {response.status}")
            except Exception as e:
                logger.error(f"❌ {check_name}: {e}")
    
    def display_ecosystem_status(self):
        """Display the current ecosystem status"""
        logger.info("\n" + "="*70)
        logger.info("🎯 ZyaeL NutriBox Real-Time Subscription Nutrition Ecosystem")
        logger.info("="*70)
        
        logger.info("📱 PORTALS:")
        logger.info("  🌐 Client Portal:     http://localhost:3000")
        logger.info("  👩‍⚕️ Nutritionist Portal: http://localhost:3000/nutritionist")
        logger.info("  👨‍🍳 Kitchen Portal:     http://localhost:3000/kitchen")
        logger.info("  🚚 Delivery Portal:    http://localhost:3000/delivery")
        logger.info("  👨‍💼 Admin Portal:       http://localhost:3000/admin")
        
        logger.info("\n🔧 API ENDPOINTS:")
        logger.info("  📊 Health Check:      http://localhost:8000/api/health")
        logger.info("  📈 Monitoring:        http://localhost:8000/api/monitoring/dashboard")
        logger.info("  📋 Daily Meals:       http://localhost:8000/api/daily-meals")
        logger.info("  🍽️ Orders:            http://localhost:8000/api/orders")
        logger.info("  🚚 Delivery Tracking: http://localhost:8000/api/delivery-tracking")
        logger.info("  📊 Reports:           http://localhost:8000/api/reports")
        
        logger.info("\n🔌 WEBSOCKET:")
        logger.info("  🌐 WebSocket URL:     ws://localhost:8000/ws")
        logger.info("  📡 Real-time Events:  Active")
        
        logger.info("\n📱 MOBILE APP:")
        logger.info("  📲 React Native:      Available (requires Android Studio)")
        logger.info("  🚀 Start Command:     cd mobile && npm run android")
        
        logger.info("\n🧪 TESTING:")
        logger.info("  🔬 Integration Tests: python api/tests/integration_test.py")
        logger.info("  📊 Load Tests:        Available in test suite")
        
        logger.info("\n🎯 REAL-TIME FEATURES:")
        logger.info("  ✅ Cross-Portal Synchronization")
        logger.info("  ✅ Live Meal Status Updates")
        logger.info("  ✅ Real-Time Delivery Tracking")
        logger.info("  ✅ Automated Daily Meal Assignment")
        logger.info("  ✅ Weekly Report Generation")
        logger.info("  ✅ Skip Meal Alerts")
        logger.info("  ✅ Performance Monitoring")
        
        logger.info("\n🔄 DAILY WORKFLOW:")
        logger.info("  6:00 AM  → Auto-create daily meals")
        logger.info("  7:00 AM  → Kitchen starts preparation")
        logger.info("  7:45 AM  → Auto-assign delivery agents")
        logger.info("  8:20 AM  → Delivery completed")
        logger.info("  8:25 AM  → Client logs consumption")
        logger.info("  Weekly   → Auto-generate progress reports")
        
        logger.info("\n🛑 TO STOP THE ECOSYSTEM:")
        logger.info("  Press Ctrl+C or run: python stop_ecosystem.py")
        
        logger.info("="*70)
    
    async def stop_ecosystem(self):
        """Stop all ecosystem services"""
        logger.info("🛑 Stopping ZyaeL NutriBox Ecosystem...")
        
        for service_name, process in self.processes.items():
            logger.info(f"🔄 Stopping {service_name}...")
            try:
                process.terminate()
                process.wait(timeout=10)
                logger.info(f"✅ {service_name} stopped")
            except subprocess.TimeoutExpired:
                logger.warning(f"⚠️ Force killing {service_name}")
                process.kill()
            except Exception as e:
                logger.error(f"❌ Error stopping {service_name}: {e}")
        
        logger.info("✅ Ecosystem stopped!")


async def main():
    """Main startup function"""
    manager = NutriBoxEcosystemManager()
    
    try:
        await manager.start_ecosystem()
        
        # Keep the ecosystem running
        logger.info("🔄 Ecosystem is running... Press Ctrl+C to stop")
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutdown signal received...")
        await manager.stop_ecosystem()
    except Exception as e:
        logger.error(f"❌ Ecosystem error: {e}")
        await manager.stop_ecosystem()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
