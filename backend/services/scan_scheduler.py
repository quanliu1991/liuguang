import threading
import logging
from database.models import SessionLocal
from api.server import get_servers
from services.container_scan_service import scan_server_containers

logger = logging.getLogger(__name__)


class ScanScheduler:
    """定时扫描服务器上的容器, 自动补录部署记录"""

    def __init__(self, app, interval: int = 3600):
        """
        Args:
            app: FastAPI app instance
            interval: 扫描间隔(秒), 默认 1 小时
        """
        self.app = app
        self._timer = None
        self.interval = interval
        self._running = False

    def start(self):
        """启动定时扫描调度器"""
        if self._running:
            logger.warning("ScanScheduler 已经在运行中")
            return
        self._running = True
        logger.info(f"ScanScheduler 启动, 扫描间隔: {self.interval} 秒")
        self._run_scan()

    def stop(self):
        """停止定时扫描调度器"""
        self._running = False
        if self._timer:
            self._timer.cancel()
            self._timer = None
        logger.info("ScanScheduler 已停止")

    def _run_scan(self):
        """执行一次完整扫描"""
        if not self._running:
            return

        db = SessionLocal()
        try:
            servers = get_servers(db)
            total_result = {
                "scanned": 0,
                "added": 0,
                "synced": 0,
                "skipped": 0,
                "removed": 0,
                "errors": [],
            }
            for server in servers:
                try:
                    result = scan_server_containers(db, server)
                    for k in ["scanned", "added", "synced", "skipped", "removed"]:
                        total_result[k] += result.get(k, 0)
                    if "errors" in result:
                        total_result["errors"].extend(result["errors"])
                except Exception as e:
                    error_msg = f"扫描服务器 {server.name} 失败: {e}"
                    logger.error(error_msg)
                    total_result["errors"].append(error_msg)

            logger.info(
                f"容器扫描完成: {total_result['scanned']} 个容器, "
                f"新增 {total_result['added']} 条部署, "
                f"同步 {total_result['synced']} 条, "
                f"清理 {total_result['removed']} 条, "
                f"跳过 {total_result['skipped']} 条"
            )
            if total_result["errors"]:
                logger.warning(f"扫描过程中出现 {len(total_result['errors'])} 个错误")
        except Exception as e:
            logger.error(f"扫描任务执行异常: {e}")
        finally:
            db.close()

        # 调度下次扫描
        if self._running:
            self._timer = threading.Timer(self.interval, self._run_scan)
            self._timer.daemon = True
            self._timer.start()
