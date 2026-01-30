import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { httpApi } from '@/api/http';

// 从 preload 获取调试开关
const DEBUG_MODE = (window as any).electronAPI?.DEBUG_MODE ?? false;

// Token 存储的 key
const TOKEN_KEY = 'client_token';

// 检查是否已登录
const isAuthenticated = (): boolean => {
  return !!httpApi.getToken() || !!localStorage.getItem(TOKEN_KEY);
};

// 路由性能追踪
const routerPerfStart = Date.now();
if (DEBUG_MODE) console.log('[Router] Starting import...');

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => {
      if (DEBUG_MODE) console.log('[Router] Loading Login...');
      const start = Date.now();
      const result = import('@/views/auth/login.vue');
      result.then(() => {
        if (DEBUG_MODE) console.log('[Router] Login loaded in', Date.now() - start, 'ms');
      });
      return result;
    },
    meta: { title: 'Login' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => {
      if (DEBUG_MODE) console.log('[Router] Loading Register...');
      const start = Date.now();
      const result = import('@/views/auth/register.vue');
      result.then(() => {
        if (DEBUG_MODE) console.log('[Router] Register loaded in', Date.now() - start, 'ms');
      });
      return result;
    },
    meta: { title: 'Register' },
  },
  {
    path: '/',
    component: () => {
      if (DEBUG_MODE) console.log('[Router] Loading AdminLayout...');
      const start = Date.now();
      const result = import('@/layouts/AdminLayout.vue');
      result.then(() => {
        if (DEBUG_MODE) console.log('[Router] AdminLayout loaded in', Date.now() - start, 'ms');
      });
      return result;
    },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => {
          if (DEBUG_MODE) console.log('[Router] Loading Dashboard...');
          const start = Date.now();
          const result = import('@/views/dashboard/index.vue');
          result.then(() => {
            if (DEBUG_MODE) console.log('[Router] Dashboard loaded in', Date.now() - start, 'ms');
          });
          return result;
        },
        meta: { title: 'Dashboard' },
      },
      {
        path: 'whatsapp',
        children: [
          {
            path: 'accounts',
            name: 'WhatsAppAccounts',
            component: () => {
              if (DEBUG_MODE) console.log('[Router] Loading AccountManager...');
              const start = Date.now();
              const result = import('@/views/whatsapp/AccountManager.vue');
              result.then(() => {
                if (DEBUG_MODE) console.log('[Router] AccountManager loaded in', Date.now() - start, 'ms');
              });
              return result;
            },
            meta: { title: '账号管理' },
          },
        ],
      },
    ],
  },
];

if (DEBUG_MODE) console.log('[Router] Routes defined in', Date.now() - routerPerfStart, 'ms');

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 导航守卫：检查登录状态
router.beforeEach((to, _from, next) => {
  if (DEBUG_MODE) {
    console.log('[Router] Navigation guard:', to.path);
  }

  const authenticated = isAuthenticated();

  // 登录和注册页面：已登录时跳转到首页
  if (to.path === '/login' || to.path === '/register') {
    if (authenticated) {
      next('/dashboard');
    } else {
      next();
    }
    return;
  }

  // 其他页面需要登录
  if (!authenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
