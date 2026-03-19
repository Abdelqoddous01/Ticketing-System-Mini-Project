<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'

const props = defineProps({
  value: {
    type: String,
    default: 'open',
  },
})

const LABEL_MAP = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const SEVERITY_MAP = {
  open: 'info',
  in_progress: 'warn',
  resolved: 'success',
  closed: 'secondary',
}

const label = computed(() => LABEL_MAP[props.value] || props.value || 'Unknown')
const severity = computed(() => SEVERITY_MAP[props.value] || 'contrast')
</script>

<template>
  <Tag :value="label" :severity="severity" rounded />
</template>
