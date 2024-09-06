let menuChart, trendChart;
let dummyData;

document.addEventListener('DOMContentLoaded', function() {
    const dateList = document.getElementById('dateList');
    const salesInfo = document.getElementById('salesInfo');

    // 더미 데이터 생성
    dummyData = generateDummyData();

    // 날짜 목록 생성 (최근 날짜가 위에 오도록 정렬)
    dummyData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(data => {
        const li = document.createElement('li');
        li.textContent = data.date;
        li.addEventListener('click', () => displaySalesInfo(data));
        dateList.appendChild(li);
    });

    // 첫 번째 날짜의 정보를 기본으로 표시
    if (dummyData.length > 0) {
        displaySalesInfo(dummyData[0]);
    }

    // 일자별 판매 추이 그래프 초기화
    initTrendChart();

    // 기간 설정 라디오 버튼 이벤트 리스너
    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', (e) => updateTrendChart(e.target.value));
    });
});

function generateDummyData() {
    const data = [];
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {  // 1년치 데이터 생성
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        data.push({
            date: formatDate(date),
            sales: {
                '기본김밥': Math.floor(Math.random() * 50) + 10,
                '참치김밥': Math.floor(Math.random() * 40) + 5,
                '치즈김밥': Math.floor(Math.random() * 30) + 5,
                '소고기김밥': Math.floor(Math.random() * 20) + 5
            }
        });
    }
    
    return data;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function displaySalesInfo(data) {
    const totalQuantity = Object.values(data.sales).reduce((a, b) => a + b, 0);
    const totalSales = Object.entries(data.sales).reduce((total, [item, quantity]) => {
        const price = getPrice(item);
        return total + (quantity * price);
    }, 0);

    salesInfo.innerHTML = `
        <h3>${data.date} 매출 정보</h3>
        <p>기본김밥: ${data.sales['기본김밥']}개</p>
        <p>참치김밥: ${data.sales['참치김밥']}개</p>
        <p>치즈김밥: ${data.sales['치즈김밥']}개</p>
        <p>소고기김밥: ${data.sales['소고기김밥']}개</p>
        <p>합계 수량: 총 ${totalQuantity}개</p>
        <p>합계 매출: ${totalSales.toLocaleString()}원</p>
    `;

    updateMenuChart(data);
}

function getPrice(item) {
    const prices = {
        '기본김밥': 2000,
        '참치김밥': 3000,
        '치즈김밥': 3000,
        '소고기김밥': 4000
    };
    return prices[item] || 0;
}

function updateMenuChart(data) {
    const ctx = document.getElementById('menuChart').getContext('2d');
    
    if (menuChart) {
        menuChart.destroy();
    }

    menuChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data.sales),
            datasets: [{
                label: '판매 수량',
                data: Object.values(data.sales),
                backgroundColor: 'rgba(29, 185, 84, 0.6)',
                borderColor: 'rgba(29, 185, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function initTrendChart() {
    updateTrendChart('week');  // 초기 설정은 주 단위
}

function updateTrendChart(period) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    let filteredData;

    switch(period) {
        case 'week':
            filteredData = dummyData.slice(0, 7);
            break;
        case 'month':
            filteredData = dummyData.slice(0, 30);
            break;
        case 'year':
            filteredData = dummyData;
            break;
    }

    const dates = filteredData.map(d => d.date);
    const quantities = filteredData.map(d => Object.values(d.sales).reduce((a, b) => a + b, 0));
    const sales = filteredData.map(d => 
        Object.entries(d.sales).reduce((total, [item, quantity]) => {
            return total + (quantity * getPrice(item));
        }, 0)
    );

    // 데이터 표준화
    const normalizedQuantities = normalize(quantities);
    const normalizedSales = normalize(sales);

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '총 판매량',
                    data: normalizedQuantities,
                    borderColor: 'rgba(29, 185, 84, 1)',
                    backgroundColor: 'rgba(29, 185, 84, 0.2)',
                    yAxisID: 'y'
                },
                {
                    label: '총 매출',
                    data: normalizedSales,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        color: '#ffffff',
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) { return value.toFixed(2); },
                        font: { size: 10 }
                    },
                    min: 0,
                    max: 1
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function normalize(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map(value => (value - min) / (max - min));
}