document.addEventListener('DOMContentLoaded', () => {
    const cartIcon = document.getElementById('cart-icon');
    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCartBtn = document.querySelector('.close-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.querySelector('.checkout-btn');

    // 장바구니 항목 저장
    let cart = [];
    
    // 장바구니 사이드바 열기/닫기
    cartIcon.addEventListener('click', () => {
        cartSidebar.classList.toggle('open');
    });

    closeCartBtn.addEventListener('click', () => {
        cartSidebar.classList.remove('open');
    });

    // 장바구니에 항목 추가
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const product = button.closest('.product-info').querySelector('h3').textContent;
            const price = parseInt(button.closest('.product-info').querySelector('.price').textContent.replace('₩', ''), 10);

            const existingItem = cart.find(item => item.product === product);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ product, price, quantity: 1 });
            }
            updateCart();
            
            // 애니메이션 효과 추가
            button.classList.add('added');
            setTimeout(() => button.classList.remove('added'), 300);
        });
    });

    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        cart.forEach((item, index) => {
            total += item.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <span>${item.product} (x${item.quantity})</span>
                <span>₩${(item.price * item.quantity).toLocaleString()}</span>
                <button class="remove-item" data-index="${index}">
                    <span class="material-icons">close</span>
                </button>
            `;
            cartItemsContainer.appendChild(itemElement);
        });

        cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartTotal.textContent = `₩${total.toLocaleString()}`;
    }

    // 장바구니 항목 삭제 기능
    cartItemsContainer.addEventListener('click', (event) => {
        if (event.target.closest('.remove-item')) {
            const index = event.target.closest('.remove-item').dataset.index;
            cart.splice(index, 1);
            updateCart();
        }
    });

// 주문하기 기능
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) {
        alert('장바구니가 비어있습니다.');
        return;
    }

    const orderItems = cart.map(item => ({
        name: item.product,
        quantity: item.quantity
    }));

    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
        const response = await fetch('http://localhost:3000/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderItems, totalAmount }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showNotification(`주문이 완료되었습니다! 주문번호: ${result.orderNum}`);
            cart = [];
            updateCart();
            cartSidebar.classList.remove('open');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('주문 처리 중 오류 발생:', error);
        alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
});

    // 알림 표시 함수
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-body">
                <span class="material-icons notification-icon">check_circle</span>
                ${message}
            </div>
            <div class="notification-progress"></div>
        `;
        document.body.appendChild(notification);

        // 알림 표시
        setTimeout(() => {
            notification.style.opacity = 1;
            notification.style.visibility = 'visible';
        }, 100);

        // 3초 후 알림 숨기기
        setTimeout(() => {
            notification.style.opacity = 0;
            notification.style.visibility = 'hidden';
            // 애니메이션 완료 후 요소 제거
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }

    // 전화 걸기 기능
    document.addEventListener('DOMContentLoaded', () => {
        const phoneButton = document.querySelector('.sub-button');
        console.log('Script loaded'); // 스크립트가 로드되었는지 확인
    
        if (phoneButton) {
            console.log('Button found'); // 버튼이 제대로 선택되었는지 확인
    
            phoneButton.addEventListener('click', () => {
                const phoneNumber = '01031810819'; 
                console.log('Button clicked'); // 버튼 클릭 확인
                alert('Button clicked'); // 알림으로 확인
                
                // 모바일 환경인지 확인
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    console.log('Mobile environment detected'); // 모바일 환경 확인
                    window.location.href = `tel:${phoneNumber}`;
                } else {
                    alert('전화 기능은 모바일 기기에서만 사용할 수 있습니다.');
                }
            });
        } else {
            console.log('Button not found'); // 버튼이 없는 경우
        }
    });
    
    
});