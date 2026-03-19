<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  value: {
    type: String,
    default: 'open',
  },
})
const { t } = useI18n()

const SEVERITY_MAP = {
  open: 'info',
  in_progress: 'warn',
  resolved: 'success',
  closed: 'secondary',
}

const label = computed(() => {
  if (!props.value) {
    return t('tickets.status.unknown')
  }

  return t(`tickets.status.${props.value}`)
})
const severity = computed(() => SEVERITY_MAP[props.value] || 'contrast')
</script>

<template>
  <Tag :value="label" :severity="severity" rounded />
</template>
