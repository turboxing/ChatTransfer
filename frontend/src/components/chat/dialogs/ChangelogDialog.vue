<template>
  <el-dialog :model-value="modelValue" :title="title" align-center width="500px"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="changelog-container">
      <div v-for="(release, index) in releases" :key="release.version" class="changelog-item">
        <div class="changelog-header">
          <el-tag :type="index === 0 ? 'primary' : 'info'" size="small">v{{ release.version }}</el-tag>
          <span class="changelog-date">{{ release.date }}</span>
          <el-tag v-if="index === 0" effect="plain" size="small" type="success">{{ latestText }}</el-tag>
        </div>
        <ul class="changelog-list">
          <li v-for="(change, index) in release.changes[locale]" :key="index">{{ change }}</li>
        </ul>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  releases: { type: Array, required: true },
  locale: { type: String, required: true },
  latestText: { type: String, required: true }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.changelog-container {
  max-height: 400px;
  overflow-y: auto;
}

.changelog-item {
  padding: 16px 0;
  border-bottom: 1px solid #ebeef5;
}

.changelog-item:last-child {
  border-bottom: none;
}

.changelog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.changelog-date {
  color: #909399;
  font-size: 13px;
}

.changelog-list {
  margin: 0;
  padding-left: 20px;
}

.changelog-list li {
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  list-style-type: disc;
}
</style>
