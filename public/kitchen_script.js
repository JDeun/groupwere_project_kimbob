document.addEventListener('DOMContentLoaded', function() {
    const orderContainer = document.getElementById('orderContainer');

    // 초기 주문 표시
    fetchOrders();

    // 주문을 주기적으로 가져오기 위한 인터벌 설정
    setInterval(fetchOrders, 5000); // 5초마다 주문 갱신
});

function fetchOrders() {
    fetch('http://localhost:3000/api/kitchen-orders')
        .then(response => response.json())
        .then(orders => {
            if (Array.isArray(orders)) {
                displayOrders(orders);
            } else {
                console.error('서버에서 받은 데이터가 배열이 아닙니다:', orders);
            }
        })
        .catch(error => {
            console.error('주문 가져오기 실패:', error);
        });
}

function displayOrders(orders) {
    const orderContainer = document.getElementById('orderContainer');
    orderContainer.innerHTML = ''; // 컨테이너 초기화

    if (orders.length === 0) {
        orderContainer.innerHTML = '<p>현재 처리할 주문이 없습니다.</p>';
        return;
    }

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

    const orderDate = document.createElement('div');
    orderDate.className = 'order-date';
    orderDate.textContent = `주문시간: ${new Date(order.orderDate).toLocaleString()}`;
    card.appendChild(orderDate);

    const orderItems = document.createElement('div');
    orderItems.className = 'order-items';
    const items = parseOrderDetails(order.orderDetails);
    for (const [item, quantity] of Object.entries(items)) {
        const itemElement = document.createElement('p');
        itemElement.textContent = `${item} : ${quantity}개`;
        orderItems.appendChild(itemElement);
    }
    card.appendChild(orderItems);

    const completeButton = document.createElement('button');
    completeButton.className = 'complete-button';
    completeButton.textContent = '조리 완료';
    completeButton.addEventListener('click', () => completeOrder(order.orderNumber, order.orderDetails));
    card.appendChild(completeButton);

    return card;
}

function parseOrderDetails(orderDetails) {
    const items = {};
    const itemArray = orderDetails.split(', ');
    itemArray.forEach(item => {
        const [name, quantityStr] = item.split('(');
        items[name] = parseInt(quantityStr);
    });
    return items;
}

function completeOrder(orderNumber, orderDetails) {
    fetch('http://localhost:3000/api/complete-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderNumber, orderDetails }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 주문 카드 제거
            const card = document.querySelector(`.order-card:has(.order-number:contains("${orderNumber}"))`);
            if (card) {
                card.remove();
            }
            console.log(data.message);
        } else {
            console.error(data.message);
        }
    })
    .catch(error => {
        console.error('주문 완료 처리 실패:', error);
    });
}