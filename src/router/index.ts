import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/modules/events/views/HomeView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/views/LoginView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/modules/auth/views/RegisterView.vue')
    },
    {
      path: '/events/:id',
      name: 'event-detail',
      component: () => import('@/modules/events/views/EventDetail.vue'),
      props: true
    },
    {
      path: '/events/create',
      name: 'create-event',
      component: () => import('@/modules/events/components/CreateEventWizard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/events/:eventId/edit',
      name: 'edit-event',
      component: () => import('@/modules/events/components/CreateEventWizard.vue'),
      props: true,
      meta: { requiresAuth: true }
    },
    {
      path: '/events/create/simple',
      name: 'create-event-simple',
      component: () => import('@/modules/events/views/CreateEvent.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/events/:eventId/invite/:code',
      name: 'invite-card',
      component: () => import('@/modules/events/views/InviteCardView.vue'),
      props: true
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

