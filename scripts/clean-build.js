const fs = require("node:fs/promises");
const path = require("node:path");

const targets = [
  ".next",
  ".next-build",
  ".next-final",
  ".next-local-build",
  "out",
  "tsconfig.tsbuildinfo"
];

const staleRoot = ".cleanup-stale";

function isWindowsLockError(error) {
  return (
    process.platform === "win32" &&
    ["EPERM", "EBUSY", "ENOTEMPTY"].includes(error?.code)
  );
}

function printWindowsHint(target, error) {
  console.error(`清理 ${target} 失败：${error.message}`);
  console.error("可能有 Node/Next 进程正在占用构建目录。");
  console.error(
    "请关闭正在运行的 npm run dev、npm run build 或 next 相关进程。"
  );
  console.error(
    "请关闭占用项目目录的终端、编辑器预览、文件管理器窗口或杀毒扫描。"
  );
  console.error(
    "如果仍然失败，请重启终端；必要时重启电脑后再执行 npm run clean。"
  );
}

async function chmodWritable(target) {
  let stats;
  try {
    stats = await fs.lstat(target);
  } catch {
    return;
  }

  await fs.chmod(target, 0o666).catch(() => undefined);

  if (!stats.isDirectory()) return;
  const entries = await fs.readdir(target, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => chmodWritable(path.join(target, entry.name)))
  );
}

async function moveToStale(relativePath, absolutePath) {
  const root = process.cwd();
  try {
    await fs.lstat(absolutePath);
  } catch {
    return null;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const staleDir = path.resolve(root, staleRoot);
  await fs.mkdir(staleDir, { recursive: true });
  const destination = path.join(
    staleDir,
    `${path.basename(relativePath)}-${stamp}-${process.pid}`
  );
  await fs.rename(absolutePath, destination);
  console.warn(
    `已将 ${relativePath} 改名隔离到 ${path.relative(root, destination)}。`
  );
  return destination;
}

async function removeIsolatedStale(stalePath) {
  if (!stalePath) return;
  try {
    await fs.rm(stalePath, {
      recursive: true,
      force: true,
      maxRetries: 1,
      retryDelay: 100
    });
  } catch (error) {
    console.warn(
      `隔离目录 ${path.relative(process.cwd(), stalePath)} 暂时无法删除：${error instanceof Error ? error.message : String(error)}`
    );
    console.warn(
      "该目录已从活动构建路径移走，可在关闭占用进程后手动删除 .cleanup-stale。"
    );
  }
}

async function removeTarget(relativePath) {
  const root = process.cwd();
  const absolutePath = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, absolutePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`拒绝清理工作区外路径：${relativePath}`);
  }

  if (process.platform === "win32") {
    const stalePath = await moveToStale(relativePath, absolutePath);
    if (stalePath) {
      await removeIsolatedStale(stalePath);
      console.log(`已清理 ${relativePath}`);
      return;
    }
  }

  try {
    await fs.rm(absolutePath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 300
    });
  } catch (error) {
    if (!isWindowsLockError(error)) throw error;
    await chmodWritable(absolutePath);
    try {
      await fs.rm(absolutePath, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 500
      });
    } catch (retryError) {
      if (!isWindowsLockError(retryError)) throw retryError;
      await moveToStale(relativePath, absolutePath);
    }
  }
  console.log(`已清理 ${relativePath}`);
}

async function main() {
  const failures = [];
  for (const target of targets) {
    try {
      await removeTarget(target);
    } catch (error) {
      failures.push({ target, error });
      if (isWindowsLockError(error)) {
        printWindowsHint(target, error);
      } else {
        console.error(
          `清理 ${target} 失败：${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  if (failures.length) {
    console.error(`构建缓存清理失败：${failures.length} 项未清理。`);
    process.exit(1);
  }

  console.log("构建缓存清理完成。");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
