const fs = require('fs');
const os = require('os');
const path = require('path');

function isWithin(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function getSystemRoots() {
  if (process.platform === 'win32') {
    return [
      process.env.SystemRoot,
      process.env.ProgramFiles,
      process.env['ProgramFiles(x86)'],
      process.env.ProgramData
    ].filter(Boolean);
  }

  return [
    '/bin',
    '/boot',
    '/dev',
    '/etc',
    '/lib',
    '/lib64',
    '/proc',
    '/run',
    '/sbin',
    '/sys',
    '/usr',
    '/var'
  ];
}

function resolvePathForValidation(filePath) {
  const resolved = path.resolve(filePath);
  let nearest = resolved;

  while (!fs.existsSync(nearest)) {
    const parent = path.dirname(nearest);
    if (parent === nearest) break;
    nearest = parent;
  }

  const nearestRealPath = fs.realpathSync(nearest);
  if (nearest === resolved) return nearestRealPath;

  return path.resolve(nearestRealPath, path.relative(nearest, resolved));
}

function validateCachePath(inputPath, {
  appRoot,
  configPath,
  currentPath,
  dataRoot,
  homeDir = os.homedir()
} = {}) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    return { valid: false, reason: 'empty' };
  }

  if (!path.isAbsolute(inputPath.trim())) {
    return { valid: false, reason: 'relative' };
  }

  const newPath = path.resolve(inputPath.trim());
  const realPath = resolvePathForValidation(newPath);
  const filesystemRoot = path.parse(realPath).root;
  const systemRoots = getSystemRoots().map((item) => resolvePathForValidation(item));
  const protectedPaths = [
    filesystemRoot,
    appRoot,
    configPath && path.dirname(configPath),
    currentPath,
    dataRoot,
    homeDir,
    process.cwd(),
    ...systemRoots
  ].filter(Boolean).map((item) => path.resolve(item));

  if (protectedPaths.some((protectedPath) => isWithin(realPath, protectedPath))) {
    return { valid: false, reason: 'protected' };
  }

  return { valid: true, path: newPath, realPath };
}

function getSafeStartupCachePath({
  appRoot,
  configPath,
  configuredPath,
  dataRoot,
  defaultPath
}) {
  if (configuredPath === defaultPath) {
    return { path: defaultPath, changed: false };
  }

  const validation = validateCachePath(configuredPath, {
    appRoot,
    configPath,
    dataRoot
  });

  if (validation.valid) {
    return { path: validation.path, changed: false };
  }

  return {
    path: defaultPath,
    changed: true,
    reason: validation.reason
  };
}

module.exports = {
  getSafeStartupCachePath,
  isWithin,
  validateCachePath
};
