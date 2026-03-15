import time
import random
import json
import os
from datetime import datetime

class AdvancedLogGenerator:
    """
    Simulates a complex multi-service environment with industry-standard log formats.
    Generates Nginx, Postgres, Auth, and Structured JSON Application logs.
    """
    def __init__(self, log_file="data/live_system.log"):
        self.log_file = log_file
        self.services = ["nginx", "postgres", "auth", "app-service"]
        
        # IPS and Usernames for realism
        self.ips = ["192.168.1.10", "10.0.0.5", "172.16.254.1", "114.12.55.90"]
        self.users = ["admin", "root", "deploy_user", "guest_99"]

    def _generate_nginx(self):
        ip = random.choice(self.ips)
        ts = datetime.now().strftime("%d/%b/%Y:%H:%M:%S +0000")
        methods = ["GET", "POST", "PUT", "DELETE"]
        paths = ["/api/v1/login", "/api/v1/data", "/health", "/admin/config", "/static/logo.png"]
        codes = [200, 201, 401, 403, 404, 500]
        
        method = random.choice(methods)
        path = random.choice(paths)
        code = random.choices(codes, weights=[70, 10, 5, 2, 8, 5])[0]
        size = random.randint(100, 5000)
        
        return f'{ip} - - [{ts}] "{method} {path} HTTP/1.1" {code} {size} "-" "Mozilla/5.0 (Cloud-Sentinel-Bot)"'

    def _generate_postgres(self):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.000 UTC")
        levels = ["LOG", "INFO", "WARNING", "ERROR", "FATAL"]
        msgs = [
            "database system is ready to accept connections",
            "could not connect to Ident server at address \"127.0.0.1\": Connection refused",
            "slow query detected: SELECT * FROM logs WHERE severity = 'ERROR' LIMIT 1000",
            "deadlock detected: Process 1234 waiting for ShareLock on transaction 555",
            "password authentication failed for user \"postgres\""
        ]
        
        level = random.choices(levels, weights=[60, 20, 10, 7, 3])[0]
        msg = random.choice(msgs)
        return f"{ts} [db_cluster_01] {level}: {msg}"

    def _generate_auth(self):
        ts = datetime.now().strftime("%b %d %H:%M:%S")
        ip = random.choice(self.ips)
        user = random.choice(self.users)
        actions = [
            f"sshd[123]: Accepted password for {user} from {ip} port 22 ssh2",
            f"sshd[456]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost={ip}  user={user}",
            f"sudo: {user} : TTY=pts/0 ; PWD=/home/{user} ; USER=root ; COMMAND=/usr/bin/apt-get update",
            f"sshd[789]: Failed password for invalid user {user} from {ip} port 54321 ssh2"
        ]
        return f"{ts} sentinel-gateway {random.choice(actions)}"

    def _generate_app_json(self):
        ts = datetime.now().isoformat()
        levels = ["DEBUG", "INFO", "WARN", "ERROR"]
        actions = ["user_signup", "payment_processed", "cache_miss", "external_api_timeout", "internal_server_error"]
        
        level = random.choices(levels, weights=[40, 40, 15, 5])[0]
        action = random.choice(actions)
        
        log_obj = {
            "timestamp": ts,
            "level": level,
            "service": "billing-v2",
            "trace_id": f"tr-{random.randint(1000, 9999)}",
            "message": f"Action {action} completed",
            "metadata": {
                "latency_ms": random.randint(5, 2000),
                "region": "us-east-1"
            }
        }
        return json.dumps(log_obj)

    def generate(self):
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        
        print(f"🚀 Advanced Industry Simulator Started")
        print(f"📝 Tailing output to: {self.log_file}")
        print("-" * 40)
        
        while True:
            try:
                # Randomly pick a service log type
                generator = random.choice([
                    self._generate_nginx, 
                    self._generate_postgres, 
                    self._generate_auth, 
                    self._generate_app_json
                ])
                
                log_line = generator()
                
                with open(self.log_file, "a") as f:
                    f.write(log_line + "\n")
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] {log_line[:80]}...")
                
                # Industry logs aren't perfectly rhythmic
                time.sleep(random.uniform(0.5, 3.0)) 
                
            except KeyboardInterrupt:
                print("\n🛑 Simulator Stopped.")
                break
            except Exception as e:
                print(f"❌ Error generating log: {e}")
                time.sleep(2)

if __name__ == "__main__":
    # Get absolute path relative to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    log_path = os.path.join(project_root, "data", "live_system.log")
    
    gen = AdvancedLogGenerator(log_file=log_path)
    gen.generate()
