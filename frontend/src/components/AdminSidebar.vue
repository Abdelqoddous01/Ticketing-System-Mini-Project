<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const isTicketsRoute = computed(
  () => route.path === '/tickets' || route.path.startsWith('/tickets/'),
)

const isUsersRoute = computed(
  () => route.path === '/admin/users' || route.path.startsWith('/admin/users/'),
)
</script>

<template>
  <aside class="admin-sidebar">
    <div class="sidebar-brand">
      <div class="app-name">Ticketing sys</div>
  
    </div>

    <hr class="sidebar-divider" />

    <nav class="sidebar-nav">
      <RouterLink
        to="/tickets"
        class="sidebar-link"
        :class="{ active: isTicketsRoute }"
      >
        <i class="pi pi-ticket" />
        <span>Tickets</span>
      </RouterLink>

      <RouterLink
        to="/admin/users"
        class="sidebar-link"
        :class="{ active: isUsersRoute }"
      >
        <i class="pi pi-users" />
        <span>Users</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 250px;
  min-width: 250px;
  height: 100vh;
  position: sticky;
  top: 0;
  align-self: flex-start;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
  background:
    radial-gradient(circle at 10% 20%, #e0f2fe 0%, transparent 38%),
    #ffffff;
  padding: 1rem 0.7rem;
}

.sidebar-brand {
  padding: 0.2rem 0.55rem 0.7rem;
}

.app-name {
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #1d4ed8;
}

.sidebar-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #6b7280;
  margin: 0.25rem 0 0;
  text-transform: uppercase;
}

.sidebar-divider {
  border: 0;
  border-top: 1px solid #e5e7eb;
}

.sidebar-nav {
  display: grid;
  gap: 0.35rem;
  margin-top: 20px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.7rem;
  border-radius: 10px;
  color: #334155;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar-link:hover {
  background: #f1f5f9;
  text-decoration: none;
}

.sidebar-link.active {
  background: #dbeafe;
  color: #1d4ed8;
}

@media (max-width: 900px) {
  .admin-sidebar {
    width: 100%;
    min-width: 0;
    height: auto;
    position: static;
    align-self: stretch;
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.7rem;
  }

  .sidebar-title {
    margin-bottom: 0.5rem;
  }

  .sidebar-divider {
    margin-bottom: 0.6rem;
  }

  .sidebar-nav {
    display: flex;
    gap: 0.45rem;
    overflow-x: auto;
  }
}
</style>
