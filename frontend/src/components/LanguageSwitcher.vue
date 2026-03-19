<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useI18n } from 'vue-i18n'

import { setLocale, SUPPORTED_LOCALES } from '../i18n'

const { t, locale } = useI18n()
const menu = ref()

const localeOptions = computed(() =>
  SUPPORTED_LOCALES.map((value) => ({
    value,
    label: t(`app.locales.${value}`),
  })),
)

const iconLabel = computed(() => `${t('app.language')}: ${t(`app.locales.${locale.value}`)}`)

const menuItems = computed(() =>
  localeOptions.value.map((option) => ({
    label: option.label,
    icon: option.value === locale.value ? 'pi pi-check' : '',
    command: () => setLocale(option.value),
  })),
)

function toggleMenu(event) {
  menu.value?.toggle(event)
}
</script>

<template>
  <div class="language-switcher">
    <Button
      icon="pi pi-language"
      severity="secondary"
      :aria-label="iconLabel"
      :title="iconLabel"
      aria-haspopup="true"
      @click="toggleMenu"
    />
    <Menu ref="menu" :model="menuItems" popup />
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
}
</style>
