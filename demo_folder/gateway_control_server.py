# gateway_control_server.py
# Script này chạy trên Raspberry Pi Gateway.
# Nó khởi động một web server để lắng nghe lệnh từ Laptop Server.
# Khi nhận được lệnh, nó sẽ gửi lệnh đó đến thuyền qua LoRa.

# --- Cài đặt --- 
# pip install Flask
# pip install pyserial
# ---------------------

from flask import Flask, request, jsonify
import serial # Thư viện để giao tiếp với cổng serial

app = Flask(__name__)

# --- Cấu hình LoRa ---
# Cấu hình cổng serial cho module LoRa của bạn.
# Tên cổng sẽ khác nhau tùy thuộc vào phần cứng của bạn.
# Ví dụ: '/dev/ttyS0' hoặc '/dev/ttyAMA0' trên Raspberry Pi
# hoặc 'COM3' trên Windows để thử nghiệm.
try:
    # Đảm bảo baud rate khớp với cấu hình module LoRa của bạn.
    lora_serial = serial.Serial('/dev/ttyS0', 9600, timeout=1)
    print("✅ Module LoRa đã kết nối qua cổng serial.")
except serial.SerialException as e:
    print(f"❌ LỖI: Không thể mở cổng serial cho LoRa: {e}")
    print("   - Hãy chắc chắn rằng tên cổng là chính xác và user có quyền truy cập.")
    print("   - Một hàm LoRa giả sẽ được sử dụng thay thế.")
    lora_serial = None
# --------------------------

def send_lora_command(command_string):
    """
    Hàm này nhận chuỗi lệnh và gửi nó qua module LoRa.
    """
    if lora_serial and lora_serial.is_open:
        try:
            print(f"📡 Đang truyền lệnh LoRa: '{command_string}'")
            # Gửi chuỗi được mã hóa thành bytes.
            lora_serial.write(command_string.encode('utf-8'))
            # Bạn có thể cần thêm ký tự xuống dòng tùy thuộc vào code ở thuyền.
            # lora_serial.write((command_string + '\n').encode('utf-8'))
            return True
        except Exception as e:
            print(f"❌ LỖI: Không thể gửi lệnh LoRa: {e}")
            return False
    else:
        # Hàm giả để thử nghiệm mà không cần module LoRa thật.
        print(f"📡 (GIẢ) Lệnh LoRa sẽ là: '{command_string}'")
        return True

@app.route('/command', methods=['POST'])
def handle_command():
    """
    Đây là API endpoint mà Laptop Server sẽ gọi.
    Nó nhận một lệnh và chuyển tiếp đến module LoRa.
    """
    if not request.is_json:
        return jsonify({"error": "Request phải là JSON"}), 400

    data = request.get_json()
    boat_id = data.get('boatId')
    command = data.get('command') # Đây là toàn bộ chuỗi lệnh từ UI

    if not boat_id or not command:
        return jsonify({"error": "Thiếu 'boatId' hoặc 'command' trong request"}), 400

    print(f"✅ Đã nhận lệnh cho thuyền '{boat_id}': {command}")

    # Dữ liệu 'command' nhận được chính là chuỗi text bạn cần
    # ví dụ: "00001,0,1500,21.689,102.092,1.0,0.1,0.05"
    # Chỉ cần gửi thẳng chuỗi này qua LoRa.
    if send_lora_command(command):
        return jsonify({"status": "Lệnh đã được gửi tới module LoRa"}), 200
    else:
        return jsonify({"error": "Không thể gửi lệnh qua LoRa"}), 500

if __name__ == '__main__':
    print("--- Gateway Control Server ---")
    # Chạy server, cho phép truy cập từ mạng nội bộ.
    # Sử dụng cổng 5000.
    app.run(host='0.0.0.0', port=5000)
