let menuChart, trendChart, inventoryChart;

document.addEventListener('DOMContentLoaded', function() {
    fetchDates();
    initInventoryChart();

    document.querySelectorAll('input[name="period"]').forEach(radio => {
        radio.addEventListener('change', (e) => updateTrendChart(e.target.value));
    });
});

function fetchDates() {
    console.log('날짜 목록 조회 시작');
    fetch('/api/boss/dates')
        .then(response => {
            console.log('날짜 목록 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(dates => {
            console.log('조회된 날짜 목록:', dates);
            const dateList = document.getElementById('dateList');
            dateList.innerHTML = ''; // 기존 목록 초기화
            dates.forEach(date => {
                const formattedDate = formatDate(date);
                const li = document.createElement('li');
                li.textContent = formattedDate;
                li.addEventListener('click', () => fetchSalesInfo(date));
                dateList.appendChild(li);
            });
            if (dates.length > 0) {
                fetchSalesInfo(dates[0]);
                updateTrendChart('week'); // 초기 트렌드 차트 로드
            }
        })
        .catch(error => {
            console.error('날짜 목록 조회 중 오류 발생:', error);
            document.getElementById('dateList').innerHTML = '<p>날짜 목록을 불러오는 데 실패했습니다.</p>';
        });
}

function fetchSalesInfo(date) {
    const formattedDate = encodeURIComponent(formatDate(date)); // 날짜 인코딩
    console.log(`${formattedDate} 매출 정보 조회 시작`);
    fetch(`/api/boss/sales/${formattedDate}`)
        .then(response => {
            console.log('매출 정보 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('조회된 매출 정보:', data);
            if (!data || Object.keys(data).length === 0) {
                throw new Error('매출 정보가 비어있습니다.');
            }
            displaySalesInfo(data);
            updateMenuChart(data);
        })
        .catch(error => {
            console.error('매출 정보 조회 중 오류 발생:', error);
            document.getElementById('salesInfo').innerHTML = '<p>매출 정보를 불러오는 데 실패했습니다.</p>';
        });
}


function displaySalesInfo(data) {
    const salesInfo = document.getElementById('salesInfo');

    // 데이터에서 첫 번째 항목의 ORDER_DATE를 사용하여 날짜 추출
    const firstOrderDate = new Date(Object.values(data.sales)[0]?.ORDER_DATE || new Date());
    const formattedDate = `${firstOrderDate.getFullYear()}-${(firstOrderDate.getMonth() + 1).toString().padStart(2, '0')}-${firstOrderDate.getDate().toString().padStart(2, '0')}`;

    salesInfo.innerHTML = `
        <h3>${formattedDate} 매출 정보</h3>
        <p>기본 김밥: ${data.sales['기본 김밥']?.quantity || 0}개</p>
        <p>참치 김밥: ${data.sales['참치 김밥']?.quantity || 0}개</p>
        <p>치즈 김밥: ${data.sales['치즈 김밥']?.quantity || 0}개</p>
        <p>소고기 김밥: ${data.sales['소고기 김밥']?.quantity || 0}개</p>
        <p>합계 수량: 총 ${Object.values(data.sales).reduce((acc, item) => acc + (item.quantity || 0), 0)}개</p>
        <p>합계 매출: ${data.totalSales.toLocaleString()}원</p>
    `;
}


function updateMenuChart(data) {
    const ctx = document.getElementById('menuChart').getContext('2d');
    console.log('Menu Chart Context:', ctx);

    if (menuChart) {
        menuChart.destroy();
    }

    menuChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data.sales),
            datasets: [{
                label: '판매 수량',
                data: Object.values(data.sales).map(item => item.quantity),
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
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff',
                        font: { size: 10 }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: { size: 10 }
                    }
                }
            }
        }
    });

    console.log('Menu Chart Data:', {
        labels: Object.keys(data.sales),
        datasets: [{
            label: '판매 수량',
            data: Object.values(data.sales).map(item => item.quantity)
        }]
    });
}


function updateTrendChart(period) {
    console.log(`${period} 기간 판매 추이 데이터 조회 시작`);
    fetch(`/api/boss/trend/${period}`)
        .then(response => {
            console.log('판매 추이 데이터 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('조회된 판매 추이 데이터:', data);
            if (!data || data.length === 0) {
                throw new Error('판매 추이 데이터가 비어있습니다.');
            }

            // 기간에 따른 라벨 필드 설정
            let labelField;
            if (period === 'week') {
                labelField = 'WEEK';
            } else if (period === 'month') {
                labelField = 'MONTH'; // 월별 필드명
            } else if (period === 'year') {
                labelField = 'YEAR'; // 연별 필드명
            }

            const ctx = document.getElementById('trendChart').getContext('2d');
            console.log('Trend Chart Context:', ctx);

            // 기존 차트가 있으면 파괴
            if (trendChart) {
                trendChart.destroy();
            }

            // 차트 생성
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(item => item[labelField]), // 기간에 맞는 라벨 설정
                    datasets: [
                        {
                            label: '총 판매량',
                            data: data.map(item => item.orders || 0), // 'orders' 필드 확인 필요
                            borderColor: 'rgba(29, 185, 84, 1)',
                            backgroundColor: 'rgba(29, 185, 84, 0.2)',
                            yAxisID: 'y'
                        },
                        {
                            label: '총 매출',
                            data: data.map(item => item.TOTAL_SALES || 0), // 필드명을 'TOTAL_SALES'로 수정
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            yAxisID: 'y1'
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
                                font: { size: 10 }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            ticks: {
                                color: '#ffffff',
                                font: { size: 10 }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff',
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });

            console.log('Trend Chart Data:', {
                labels: data.map(item => item[labelField]),
                datasets: [
                    {
                        label: '총 판매량',
                        data: data.map(item => item.orders || 0)
                    },
                    {
                        label: '총 매출',
                        data: data.map(item => item.TOTAL_SALES || 0)
                    }
                ]
            });
        })
        .catch(error => {
            console.error('판매 추이 데이터 조회 중 오류 발생:', error);
            document.getElementById('trendChart').innerHTML = '<p>판매 추이 데이터를 불러오는 데 실패했습니다.</p>';
        });
}



function initInventoryChart() {
    console.log('재고 정보 조회 시작');
    fetch('/api/boss/inventory')
        .then(response => {
            console.log('재고 정보 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('조회된 재고 정보:', data);
            const ctx = document.getElementById('inventoryChart').getContext('2d');
            console.log('Inventory Chart Context:', ctx); // ctx 로그 추가
            
            if (inventoryChart) {
                inventoryChart.destroy();
            }

            inventoryChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(item => item.name),
                    datasets: [{
                        label: '재고량',
                        data: data.map(item => item.volume),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
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
                                font: { size: 10 }
                            }
                        },
                        x: {
                            ticks: {
                                color: '#ffffff',
                                font: { size: 10 }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff',
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });

            console.log('Inventory Chart Data:', {
                labels: data.map(item => item.name),
                datasets: [{
                    label: '재고량',
                    data: data.map(item => item.volume)
                }]
            }); // 데이터 로그 추가
        })
        .catch(error => {
            console.error('재고 정보 조회 중 오류 발생:', error);
            document.getElementById('inventoryChart').innerHTML = '<p>재고 정보를 불러오는 데 실패했습니다.</p>';
        });
}


function formatDate(date) {
    const [year, month, day] = date.split('/'); // 순서를 year, month, day로 수정
    const formattedYear = year.padStart(2, '0'); // `YY` 형식으로 유지
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');
    
    return `${formattedYear}/${formattedMonth}/${formattedDay}`;
}
