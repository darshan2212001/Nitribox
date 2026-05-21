import { Link } from "wouter";
import { Heart } from "lucide-react";

export default function ClientFooter() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "/client" },
    { label: "My Plans", href: "/client?tab=orders" },
    { label: "Blog", href: "/client?tab=blog" },
    { label: "Contact", href: "/client?tab=contact" },
    { label: "Support", href: "/client?tab=support" },
  ];

  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Brand Section */}
          <div>
            <h3 className="text-lg font-bold text-primary mb-3">ZyaeL NutriBox</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nutrition Crafted With Care
            </p>
            <p className="text-xs text-muted-foreground">
              Every meal is thoughtfully crafted by expert nutritionists, inspired by the warmth of a mother's kitchen.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    data-testid={`link-footer-${link.label.toLowerCase().replace(' ', '-')}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Contact Us</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Phone: +91 6363882921</li>
              <li>Email: inquiries@zyaelnutribox.com</li>
              <li>Feedback: feedback@zyaelnutribox.com</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © {currentYear} | Powered by Orbfocus Healthcare
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-destructive fill-destructive" /> for your health
          </p>
        </div>
      </div>
    </footer>
  );
}
