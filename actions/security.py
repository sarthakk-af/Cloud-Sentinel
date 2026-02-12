import re

def block_ip(event, classification):
    match = re.search(r'\d+\.\d+\.\d+\.\d+', event.raw)

    if match:
        ip = match.group()
        print(f"[ACTION] Blocking IP {ip}")
    else:
        print("[ACTION] No IP found in log")
