import React, { useRef, useEffect } from "react";

const Console = ({ logs }) => {
  const consoleRef = useRef(null);
  const previousScrollHeightRef = useRef(null); // Ref để lưu trữ scrollHeight trước đó

  useEffect(() => {
    const textarea = consoleRef.current;
    if (textarea) {
      const prevScrollHeight = previousScrollHeightRef.current;
      const currentScrollHeight = textarea.scrollHeight;
      const currentClientHeight = textarea.clientHeight;
      const currentScrollTop = textarea.scrollTop;

      // Ngưỡng để xác định xem người dùng có ở "gần cuối" không
      // Điều này giúp xử lý các sai số nhỏ hoặc nếu người dùng không cuộn chính xác xuống dưới cùng
      const SCROLL_THRESHOLD = 5; // pixel

      let shouldAutoScroll = false;

      if (prevScrollHeight === undefined || prevScrollHeight === null) {
        // Nếu đây là lần tải đầu tiên hoặc không có scrollHeight trước đó, hãy tự động cuộn
        shouldAutoScroll = true;
      } else {
        // Nếu người dùng đã cuộn xuống cuối (hoặc rất gần cuối) trước khi các log mới này đến
        // prevScrollHeight là chiều cao *trước khi* các log hiện tại được thêm vào.
        // currentScrollTop là vị trí cuộn *trước khi* chúng ta can thiệp trong effect này.
        if (
          currentScrollTop + currentClientHeight >=
          prevScrollHeight - SCROLL_THRESHOLD
        ) {
          shouldAutoScroll = true;
        }
      }

      if (shouldAutoScroll) {
        textarea.scrollTop = currentScrollHeight;
      }

      // Cập nhật previousScrollHeightRef với scrollHeight hiện tại cho lần cập nhật tiếp theo
      previousScrollHeightRef.current = currentScrollHeight;
    }
  }, [logs]); // Chạy effect này khi logs thay đổi

  return (
    <div className="console-container">
      <h3>Console</h3>
      <textarea
        id="console-textarea"
        className="form-control"
        value={logs.join("\n")}
        readOnly
        ref={consoleRef}
      ></textarea>
    </div>
  );
};

export default Console;
