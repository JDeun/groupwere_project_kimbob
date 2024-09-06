// 가상의 주문 데이터
let orders = [
    {
        orderNumber: '202409060001',
        items: {
            '기본김밥': 4,
            '참치김밥': 1
        }
    },
    {
        orderNumber: '202409060002',
        items: {
            '치즈김밥': 2,
            '소고기김밥': 3
        }
    }
];

document.addEventListener('DOMContentLoaded', function() {
    const orderContainer = document.getElementById('orderContainer');

    // 초기 주문 표시
    displayOrders();

    // 새 주문을 시뮬레이션하기 위한 인터벌 설정
    setInterval(addNewOrder, 30000); // 30초마다 새 주문 추가
});

function displayOrders() {
    const orderContainer = document.getElementById('orderContainer');
    orderContainer.innerHTML = ''; // 컨테이너 초기화

    orders.forEach(order => {
        const card = createOrderCard(order);
        orderContainer.appendChild(card);
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';

    const orderNumber = document.createElement('div');
    orderNumber.className = 'order-number';
    orderNumber.textContent = `주문번호: ${order.orderNumber}`;
    card.appendChild(orderNumber);

    const orderItems = document.createElement('div');
    orderItems.className = 'order-items';
    for (const [item, quantity] of Object.entries(order.items)) {
        const itemElement = document.createElement('p');
        itemElement.textContent = `${item} : ${quantity}개`;
        orderItems.appendChild(itemElement);
    }
    card.appendChild(orderItems);

    const completeButton = document.createElement('button');
    completeButton.className = 'complete-button';
    completeButton.textContent = '조리 완료';
    completeButton.addEventListener('click', () => completeOrder(order.orderNumber));
    card.appendChild(completeButton);

    return card;
}

function completeOrder(orderNumber) {
    orders = orders.filter(order => order.orderNumber !== orderNumber);
    displayOrders();
}

function addNewOrder() {
    const newOrderNumber = generateOrderNumber();
    const newOrder = {
        orderNumber: newOrderNumber,
        items: generateRandomItems()
    };
    orders.push(newOrder);
    displayOrders();
}

function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const orderCount = String(orders.length + 1).padStart(4, '0');
    return `${year}${month}${day}${orderCount}`;
}

function generateRandomItems() {
    const items = ['기본김밥', '참치김밥', '치즈김밥', '소고기김밥'];
    const randomItems = {};
    const itemCount = Math.floor(Math.random() * 3) + 1; // 1~3개의 아이템

    for (let i = 0; i < itemCount; i++) {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        const quantity = Math.floor(Math.random() * 5) + 1; // 1~5개의 수량
        randomItems[randomItem] = (randomItems[randomItem] || 0) + quantity;
    }

    return randomItems;
}