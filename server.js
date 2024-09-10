const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const cors = require('cors');

// Oracle Instant Client 초기화
try {
  oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
} catch (err) {
  console.error('Oracle Instant Client 초기화 중 오류 발생:', err);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
  user: "HR",
  password: "1234",
  connectString: "localhost:1521/XE"
};

// 주문 API
app.post('/api/order', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const { orderItems, totalAmount } = req.body;

    console.log('Received order:', { orderItems, totalAmount });  // 로그 추가

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      throw new Error('주문 항목이 올바르지 않습니다.');
    }

    // orderItems를 문자열로 변환
    const orderDetails = orderItems.map(item => `${item.name}(${item.quantity})`).join(', ');

    // 주문 정보 저장
    const orderResult = await connection.execute(
      `INSERT INTO GIMBAP_ORDER (ORDER_NUM, ORDER_DATE, ORDER_DETAILS, ORDER_AMOUNT, ORDER_STATUS) 
       VALUES (GIMBAP_ORDER_SEQ.NEXTVAL, SYSDATE, :orderDetails, :totalAmount, 'PENDING')
       RETURNING ORDER_NUM INTO :orderNum`,
      { 
        orderDetails, 
        totalAmount, 
        orderNum: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } 
      },
      { autoCommit: false }
    );
    
    const orderNum = orderResult.outBinds.orderNum[0];

    // GIMBAP_ORDER_DETAILS 테이블에 주문 상세 정보 저장
    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO GIMBAP_ORDER_DETAILS (ORDER_NUM, ITEM_NAME, QUANTITY) 
         VALUES (:orderNum, :itemName, :quantity)`,
        {
          orderNum: orderNum,
          itemName: item.name,
          quantity: item.quantity
        },
        { autoCommit: false }
      );
    }

    // GIMBAP_SALES 테이블 업데이트 (당일 판매 정보 갱신)
    await connection.execute(
      `MERGE INTO GIMBAP_SALES s
       USING (SELECT TRUNC(SYSDATE) as SALES_DATE, :totalAmount as AMOUNT FROM DUAL) t
       ON (s.SALES_DATE = t.SALES_DATE)
       WHEN MATCHED THEN
         UPDATE SET s.SALES_VOLUME = s.SALES_VOLUME + 1,
                    s.SALES_SUM = s.SALES_SUM + t.AMOUNT
       WHEN NOT MATCHED THEN
         INSERT (SALES_DATE, SALES_VOLUME, SALES_SUM)
         VALUES (t.SALES_DATE, 1, t.AMOUNT)`,
      { totalAmount },
      { autoCommit: false }
    );

    await connection.commit();
    
    res.json({ success: true, message: '주문이 완료되었습니다!', orderNum: orderNum });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('롤백 중 오류 발생:', rollbackError);
      }
    }
    console.error('주문 처리 중 오류 발생:', error);
    res.status(500).json({ success: false, message: error.message || '주문 처리 중 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('데이터베이스 연결 종료 중 오류 발생:', error);
      }
    }
  }
});


// 주방용 주문 조회 API
app.get('/api/kitchen-orders', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `SELECT ORDER_NUM, ORDER_DATE, ORDER_DETAILS, ORDER_AMOUNT
       FROM GIMBAP_ORDER
       WHERE ORDER_DATE >= TRUNC(SYSDATE) AND ORDER_STATUS = 'PENDING'
       ORDER BY ORDER_DATE DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const orders = result.rows.map(row => ({
      orderNumber: row.ORDER_NUM,
      orderDate: row.ORDER_DATE,
      orderDetails: row.ORDER_DETAILS,
      orderAmount: row.ORDER_AMOUNT
    }));

    res.json(orders);
  } catch (error) {
    console.error('주문 조회 중 오류 발생:', error);
    res.status(500).json({ error: '주문 조회 중 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('데이터베이스 연결 종료 중 오류 발생:', error);
      }
    }
  }
});

// 조리 완료 및 재고 업데이트 API
app.post('/api/complete-order', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    const { orderNumber, orderDetails } = req.body;

    // 재고 업데이트
    await updateIngredients(connection, orderDetails);

    // 주문 상태 업데이트
    await connection.execute(
      `UPDATE GIMBAP_ORDER SET ORDER_STATUS = 'COMPLETED' WHERE ORDER_NUM = :orderNumber`,
      [orderNumber],
      { autoCommit: true }
    );

    res.json({ success: true, message: '주문이 완료되었고 재고가 업데이트되었습니다.' });
  } catch (error) {
    console.error('주문 완료 처리 중 오류 발생:', error);
    res.status(500).json({ success: false, message: '주문 완료 처리 중 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('데이터베이스 연결 종료 중 오류 발생:', error);
      }
    }
  }
});

async function updateIngredients(connection, orderDetails) {
  const items = parseOrderDetails(orderDetails);
  for (const [item, quantity] of Object.entries(items)) {
    const ingredients = getIngredientsForItem(item);
    for (const [ingredient, amount] of Object.entries(ingredients)) {
      await connection.execute(
        `UPDATE GIMBAP_INGREDIENTS 
         SET VOLUME = VOLUME - :amount 
         WHERE INGREDIENT_NAME = :ingredient`,
        { amount: amount * quantity, ingredient },
        { autoCommit: true }
      );
    }
  }
}

function getIngredientsForItem(item) {
  const baseIngredients = {
    kim: 1, bob: 1, carrot: 1, danmuzi: 1, spinach: 1, egg: 1
  };

  const normalizedItem = item.replace(/\s+/g, '').toLowerCase();

  switch (normalizedItem) {
    case '참치김밥':
      return { ...baseIngredients, tuna: 1 };
    case '치즈김밥':
      return { ...baseIngredients, cheese: 1 };
    case '소고기김밥':
      return { ...baseIngredients, beef: 1 };
    case '기본김밥':
      return baseIngredients;
    default:
      console.warn(`알 수 없는 김밥 종류: ${item}`);
      return baseIngredients;
  }
}

function parseOrderDetails(orderDetails) {
  const items = {};
  const itemArray = orderDetails.split(', ');
  itemArray.forEach(item => {
    const [name, quantityStr] = item.split('(');
    items[name.trim()] = parseInt(quantityStr.replace(')', ''));
  });
  return items;
}

// Boss 대시보드용 API 엔드포인트

// 날짜 목록 조회 API
app.get('/api/boss/dates', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT DISTINCT TO_CHAR(ORDER_DATE, 'YY/MM/DD') AS ORDER_DATE 
       FROM GIMBAP_ORDER 
       ORDER BY ORDER_DATE DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows.map(row => row.ORDER_DATE));
  } catch (error) {
    console.error('날짜 목록 조회 중 오류 발생:', error);
    res.status(500).json({ error: '날짜 목록 조회 중 오류가 발생했습니다.', details: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('데이터베이스 연결 종료 중 오류 발생:', error);
      }
    }
  }
});

// 매출 정보 조회 API
app.get('/api/boss/sales/:date', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const date = req.params.date; // 'YY/MM/DD' 형식

    if (!date) {
      res.status(400).json({ error: '날짜가 제공되지 않았습니다.' });
      return;
    }

    // 직접 날짜 값을 SQL에 삽입
    const sqlQuery = `
        SELECT o.ORDER_NUM, o.ORDER_DATE, o.ORDER_AMOUNT, od.ITEM_NAME, od.QUANTITY
        FROM GIMBAP_ORDER o
        JOIN GIMBAP_ORDER_DETAILS od ON o.ORDER_NUM = od.ORDER_NUM
        WHERE TRUNC(o.ORDER_DATE) = TRUNC(TO_DATE('${date}', 'YY/MM/DD'))
    `;

    console.log('Executing query with date:', date);  // 로그 추가

    const result = await connection.execute(sqlQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    console.log('Query result:', result.rows); // 로그 추가

    // 결과 처리
    const sales = {};
    let totalSales = 0;

    result.rows.forEach(row => {
      const itemName = row.ITEM_NAME;
      const quantity = row.QUANTITY;
      const orderAmount = row.ORDER_AMOUNT;

      if (!sales[itemName]) {
        sales[itemName] = { quantity: 0, amount: 0 };
      }
      sales[itemName].quantity += quantity;
      sales[itemName].amount += orderAmount;
      totalSales += orderAmount;
    });

    console.log('Processed sales data:', { sales, totalSales }); // 로그 추가

    res.json({ sales, totalSales });
  } catch (error) {
    console.error('매출 정보 조회 중 오류 발생:', error);
    res.status(500).json({ error: '매출 정보 조회 중 오류가 발생했습니다.', details: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('데이터베이스 연결 종료 중 오류 발생:', error);
      }
    }
  }
});


// 판매 추이 데이터 조회 API (주별)
app.get('/api/boss/trend/week', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT TO_CHAR(ORDER_DATE, 'YYYY-IW') AS WEEK, SUM(ORDER_AMOUNT) AS TOTAL_SALES
       FROM GIMBAP_ORDER
       WHERE ORDER_DATE >= TRUNC(SYSDATE) - 365
       GROUP BY TO_CHAR(ORDER_DATE, 'YYYY-IW')
       ORDER BY WEEK DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 결과를 클라이언트에 전송
    res.json(result.rows); // JSON 형태로 변환하여 클라이언트에 반환

  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
});

// 판매 추이 데이터 조회 API (월별)
app.get('/api/boss/trend/month', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT TO_CHAR(ORDER_DATE, 'YYYY-MM') AS MONTH, SUM(ORDER_AMOUNT) AS TOTAL_SALES
       FROM GIMBAP_ORDER
       WHERE ORDER_DATE >= TRUNC(SYSDATE) - 365
       GROUP BY TO_CHAR(ORDER_DATE, 'YYYY-MM')
       ORDER BY MONTH DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows); // 결과를 클라이언트로 반환

  } catch (error) {
    console.error('Error fetching monthly trend data:', error);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
});

// 판매 추이 데이터 조회 API (연별)
app.get('/api/boss/trend/year', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `SELECT TO_CHAR(ORDER_DATE, 'YYYY') AS YEAR, SUM(ORDER_AMOUNT) AS TOTAL_SALES
       FROM GIMBAP_ORDER
       WHERE ORDER_DATE >= TRUNC(SYSDATE) - 365 * 5 -- 최근 5년 데이터 조회
       GROUP BY TO_CHAR(ORDER_DATE, 'YYYY')
       ORDER BY YEAR DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows); // 결과를 클라이언트로 반환

  } catch (error) {
    console.error('Error fetching yearly trend data:', error);
    res.status(500).send('Server Error');
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
});


// 재고량 조회 API
app.get('/api/boss/inventory', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT INGREDIENT_NAME, VOLUME 
       FROM GIMBAP_INGREDIENTS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const ingredients = result.rows.map(row => ({
      name: row.INGREDIENT_NAME,
      volume: row.VOLUME
    }));

    res.json(ingredients);
  } catch (error) {
    console.error('재고량 조회 중 오류 발생:', error);
    res.status(500).json({ error: '재고량 조회 중 오류가 발생했습니다.', details: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('데이터베이스 연결 종료 중 오류 발생:', error);
      }
    }
  }
});


// 페이지 라우트
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

app.get('/kitchen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kitchen.html'));
});

app.get('/boss', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'boss.html'));
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});


