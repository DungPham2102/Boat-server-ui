# gateway_simulator.py
# Script này giả lập một Gateway (ví dụ: Raspberry Pi).
# Nó khởi động một web server để lắng nghe lệnh điều khiển từ Laptop Server (server.js).
# Khi nhận được lệnh, nó sẽ in ra console để xác nhận, giả lập việc gửi lệnh đó đến một chiếc thuyền qua LoRa.

# --- Cài đặt --- 
# pip install Flask
# ---------------------

from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/command', methods=['POST'])
def handle_command():
    """
    Đây là API endpoint mà Laptop Server sẽ gọi đến.
    Nó nhận một đối tượng JSON chứa lệnh và in ra console.
    """
    # Lấy dữ liệu JSON từ request
    data = request.get_json()

    if not data:
        print("⚠️ Nhận được request nhưng không có body hoặc không phải JSON.")
        return "Lỗi: Request body trống hoặc không phải JSON", 400

    # In dữ liệu nhận được ra console để giả lập việc gửi lệnh đi
    print(f"✅ Received command. Transmitting to boat via LoRa: {data}")

    # Trả về một phản hồi thành công
    return jsonify({"status": "success", "message": "Command received by Gateway and sent to boat"}), 200

if __name__ == '__main__':
    port = 10000
    print("--- Gateway Simulator ---")
    print(f"Listening on http://localhost:{port}/command...")
    # Chạy server, cho phép truy cập từ mọi địa chỉ IP trong mạng.
    app.run(host='0.0.0.0', port=port)
