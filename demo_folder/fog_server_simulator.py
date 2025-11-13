# fog_server_simulator.py
# Script này giả lập một Fog Server.
# Nó khởi động một web server để lắng nghe lệnh điều khiển từ Laptop Server (server.js).
# Khi nhận được lệnh, nó sẽ in ra console để xác nhận.

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

    # In dữ liệu nhận được ra console
    print(f"✅ Đã nhận được lệnh: {data}")

    # Trả về một phản hồi thành công
    return jsonify({"status": "success", "message": "Command received by Fog Server"}), 200

if __name__ == '__main__':
    port = 10000
    print("--- Fog Server Simulator ---")
    print(f"🚀 Đang lắng nghe trên cổng {port}...")
    # Chạy server, cho phép truy cập từ mọi địa chỉ IP trong mạng.
    app.run(host='0.0.0.0', port=port)
