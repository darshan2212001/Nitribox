import { Users, Stethoscope, Truck, Shield, ChefHat, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";

interface RoleSelectorProps {
  onRoleSelect: (role: string) => void;
}

export default function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const { user, logout } = useAuth();
  const roles = [
    {
      id: 'client',
      title: 'Client Portal',
      description: 'Track meals, nutrition & connect with nutritionists',
      icon: Users,
      color: 'from-[#006442] to-[#00845A]',
    },
    {
      id: 'kitchen',
      title: 'Cloud Kitchen',
      description: 'Manage orders, meal prep & delivery coordination',
      icon: ChefHat,
      color: 'from-[#DC2626] to-[#EF4444]',
    },
    {
      id: 'nutritionist',
      title: 'Nutritionist Portal',
      description: 'Manage clients & track their progress',
      icon: Stethoscope,
      color: 'from-[#0077B6] to-[#0096C7]',
    },
    {
      id: 'delivery',
      title: 'Delivery Agent',
      description: 'Manage deliveries & track routes',
      icon: Truck,
      color: 'from-[#FF8C00] to-[#FFA500]',
    },
    {
      id: 'admin',
      title: 'Admin Panel',
      description: 'Manage users, menus & analytics',
      icon: Shield,
      color: 'from-[#6B46C1] to-[#805AD5]',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#006442] mb-4">
            ZyaeL NutriBox
          </h1>
          <p className="text-lg text-foreground/70">
            Home-Cooked Goodness, Perfected by Nutritionists
          </p>
          
          {user && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6 inline-flex items-center gap-4 bg-white rounded-full px-6 py-3 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="font-medium text-gray-900">{user.name}</span>
                <span className="text-sm text-gray-500">({user.role})</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onRoleSelect(role.id)}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 text-left overflow-hidden"
                data-testid={`button-role-${role.id}`}
              >
                <motion.div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.color} opacity-10 rounded-bl-full`}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                />
                <div className="relative">
                  <motion.div
                    className={`inline-flex p-4 bg-gradient-to-br ${role.color} rounded-xl mb-4`}
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {role.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            Contact: +91 6363882921 | inquiries@zyaelnutribox.com
          </p>
        </motion.div>
      </div>
    </div>
  );
}
