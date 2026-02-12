# engine/executor.py

class Executor:
    """
    Executes remediation actions safely.
    """

class Executor:

    def __init__(self):
        from actions.memory import fix_memory
        from actions.service import restart_service
        from actions.security import block_ip
        from actions.disk import clear_disk

        self.action_map = {
            "clear_ram": fix_memory,
            "restart_service": restart_service,
            "block_ip": block_ip,
            "clear_disk": clear_disk
        }


    def execute(self, classification, event):
        action_name = classification["action"]

        if action_name not in self.action_map:
            print(f"[EXECUTOR] No handler for action: {action_name}")
            return

        try:
            print(f"[EXECUTOR] Running action: {action_name}")
            self.action_map[action_name](event, classification)
            print("[EXECUTOR] Action completed successfully")

        except Exception as e:
            print(f"[EXECUTOR ERROR] {e}")
