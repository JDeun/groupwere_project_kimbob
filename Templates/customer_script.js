document.addEventListener('DOMContentLoaded', () => {
    const cartIcon = document.getElementById('cart-icon');
    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCartBtn = document.querySelector('.close-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');

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

            cart.push({ product, price });
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
            total += item.price;
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <span>${item.product}</span>
                <span>₩${item.price.toLocaleString()}</span>
                <button class="remove-item" onclick="removeItem(${index})">
                    <span class="material-icons">close</span>
                </button>
            `;
            cartItemsContainer.appendChild(itemElement);
        });

        cartCount.textContent = cart.length;
        cartTotal.textContent = `₩${total.toLocaleString()}`;
    }

    // 장바구니 항목 삭제 기능
    window.removeItem = function(index) {
        cart.splice(index, 1);
        updateCart();
    }

    // 전화 걸기 기능
    const phoneButton = document.querySelector('.sub-button');
    phoneButton.addEventListener('click', () => {
        const phoneNumber = '01031810819'; 
        window.location.href = `tel:${phoneNumber}`;
    });
});