from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("captures.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app) # Enable CORS for extension communication

# In-memory storage for this MVP
captures = []

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()}), 200

@app.route('/stats', methods=['GET'])
def stats():
    return jsonify({
        "total_captures": len(captures),
        "last_capture": captures[-1]['timestamp'] if captures else None
    }), 200

@app.route('/capture', methods=['POST'])
def capture():
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No JSON payload provided"}), 400

    def log_to_group(payload):
        """Log payload to group-specific log file"""
        group_name = payload.get('group_name', 'default')
        log_filename = f"{group_name}.log"

        # Get or create logger for this group
        group_logger = logging.getLogger(f"group.{group_name}")
        if not group_logger.handlers:
            handler = logging.FileHandler(log_filename)
            handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
            group_logger.addHandler(handler)
            group_logger.setLevel(logging.INFO)

        group_logger.info(f"Captured request: {payload.get('request', {}).get('url', 'Unknown')}")
        group_logger.info(f"Full payload: {payload}")

    # Logic for batch capture
    if 'captures' in data and isinstance(data['captures'], list):
        batch = data['captures']
        captures.extend(batch)
        logger.info(f"Received batch of {len(batch)} captures")
        for capture_item in batch:
            log_to_group(capture_item)
        return jsonify({"status": "success", "received": len(batch)}), 200

    # Single capture
    captures.append(data)
    log_to_group(data)

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    # Run on port 8000 as planned
    app.run(host='0.0.0.0', port=8000, debug=True)
