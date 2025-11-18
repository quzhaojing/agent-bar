import { useState, useEffect } from 'react';

interface Route {
  path: string;
  component: React.ComponentType | (({ params }: { params: Record<string, string> }) => React.ReactElement);
}

export class Router {
  private routes: Route[] = [];
  private currentPath: string = '';
  private listeners: ((path: string) => void)[] = [];

  constructor() {
    // Initialize with current hash
    this.currentPath = window.location.hash.slice(1) || '/';

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const newPath = window.location.hash.slice(1) || '/';
      if (newPath !== this.currentPath) {
        this.currentPath = newPath;
        this.notifyListeners();
      }
    });
  }

  addRoute(path: string, component: React.ComponentType | (({ params }: { params: Record<string, string> }) => React.ReactElement)) {
    this.routes.push({ path, component });
  }

  navigate(path: string) {
    window.location.hash = path;
  }

  getCurrentComponent(): React.ComponentType | null {
    // Try exact match first
    const exactRoute = this.routes.find(r => r.path === this.currentPath);
    if (exactRoute) {
      return exactRoute.component as React.ComponentType;
    }

    // Try parameterized routes
    for (const route of this.routes) {
      if (route.path.includes(':')) {
        const routeParts = route.path.split('/');
        const pathParts = this.currentPath.split('/');

        if (routeParts.length === pathParts.length) {
          const params: Record<string, string> = {};
          let match = true;

          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
              const paramName = routeParts[i].substring(1);
              params[paramName] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
              match = false;
              break;
            }
          }

          if (match) {
            // Return a component that renders the dynamic component with params
            return () => (route.component as ({ params }: { params: Record<string, string> }) => React.ReactElement)({ params });
          }
        }
      }
    }

    return null;
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  subscribe(listener: (path: string) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentPath));
  }
}

export const router = new Router();

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(router.getCurrentPath());

  useEffect(() => {
    const unsubscribe = router.subscribe((path) => {
      setCurrentPath(path);
    });

    return unsubscribe;
  }, []);

  return {
    currentPath,
    navigate: router.navigate.bind(router),
    getCurrentComponent: router.getCurrentComponent.bind(router)
  };
}