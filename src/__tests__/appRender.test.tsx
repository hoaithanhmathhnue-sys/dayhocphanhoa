import { act } from 'react';
import ReactDOM from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('App Integration Render & 5-Step Navigation', () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('hiển thị mặc định kịch bản Bài 21 với đầy đủ 3 cây cầu và chuyển mượt qua cả 5 Bước', () => {
    act(() => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('MathDiff 5 AI');
    expect(container.textContent).toContain('Bài 21: So sánh các số thập phân');
    expect(container.textContent).toContain('Cầu Long Biên');
    expect(container.textContent).toContain('2,29 km');
    expect(container.textContent).toContain('Cầu An Đông');
    expect(container.textContent).toContain('3,5 km');
    expect(container.textContent).toContain('Cầu Cần Thơ');
    expect(container.textContent).toContain('2,75 km');

    // Chuyển sang Bước 1: Quản lý Lớp & Phân Trạm
    const navButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('nav button'),
    );
    expect(navButtons.length).toBe(5);

    act(() => {
      navButtons[0].click();
    });
    expect(container.textContent).toContain('Bước 1: Quản lý Lớp 5A & Phân Trạm Linh Hoạt');

    // Chuyển sang Bước 4: Bức tường Đa Cách Giải
    act(() => {
      navButtons[3].click();
    });
    expect(container.textContent).toContain('Bước 4: Bức Tường Đa Cách Giải');

    // Chuyển sang Bước 5: AI Ứng biến nóng & Luyện tập
    act(() => {
      navButtons[4].click();
    });
    expect(container.textContent).toContain('Bước 5: Trợ Lý "AI Ứng Biến Nóng"');
  });
});
