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
    This is the API endpoint that the main server will call.
    It receives a JSON command object and forwards it to the LoRa module as a formatted string.
    """
    # Get the JSON data from the request
    data = request.get_json()

    if not data:
        return "Error: Request body is empty or not JSON", 400

    # Extract required fields from the JSON data
    try:
        boat_id = data['boatId']
        # Use .get() for optional fields with default values
        speed = data.get('speed', 1500)
        target_lat = data.get('targetLat', 0)
        target_lon = data.get('targetLon', 0)
        kp = data.get('kp', 0)
        ki = data.get('ki', 0)
        kd = data.get('kd', 0)
        
        print(f"✅ Received command for boat '{boat_id}': {data}")

    except KeyError as e:
        print(f"❌ Error: Missing key in JSON data: {e}")
        return f"Error: Missing key in JSON data: {e}", 400

    # Format the data into the string format expected by the LoRa module/boat
    # Format: "boat_id,speed,target_lat,target_lon,kp,ki,kd"
    command_string = f"{boat_id},{speed},{target_lat},{target_lon},{kp},{ki},{kd}"

    # Send the formatted string command via LoRa
    if send_lora_command(command_string):
        return "Command sent to LoRa module", 200
    else:
        return "Failed to send command via LoRa", 500

if __name__ == '__main__':
    print("--- Gateway Control Server ---")
    # Chạy server, cho phép truy cập từ mạng nội bộ.
    # Sử dụng cổng 5000.
    app.run(host='0.0.0.0', port=5000)
