import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/levels',
    name: 'LevelSelect',
    component: () => import('@/views/LevelSelectView.vue'),
  },
  {
    path: '/game/:levelId',
    name: 'Game',
    component: () => import('@/views/GameView.vue'),
  },
  {
    path: '/result/:levelId',
    name: 'Result',
    component: () => import('@/views/ResultView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let storageLoaded = false

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (!storageLoaded) {
    userStore.loadFromStorage()
    storageLoaded = true
  }

  if (userStore.isNewUser && to.path !== '/') {
    next('/')
  } else if (!userStore.isNewUser && to.path === '/') {
    next('/levels')
  } else {
    next()
  }
})

export default router