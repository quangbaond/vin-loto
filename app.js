const express = require('express')
const app = express()
const port = 3000
const bodyParser = require('body-parser')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
const cors = require('cors')
const db = require('./db')
const room_prefix = {
    so_cap: {
        name: 'so_cap',
        users: [],
        messages: [],
        // min là 2 triệu
        min: 2000,
        max: 100000
    },
    trung_cap: {
        name: 'so_chan',
        users: [],
        messages: [],
        min: 100000,
        max: 5000000

    },
    cao_cap: {
        name: 'cao_cap',
        users: [],
        messages: [],
        min: 5000000,
        max: 20000000
    },
    vip: {
        name: 'vip',
        users: [],
        messages: [],
        min: 20000000,
        max: 100000000
    }
}

const phiens = []

const io = require('socket.io')(3001, {
    cors: {
        origin: '*',
    }
})

const createPhien = (room) => {
    const so1 = Math.floor(Math.random() * 9)
    const so2 = Math.floor(Math.random() * 9)
    const so3 = Math.floor(Math.random() * 9)
    const result = so1 == 0 ? so2 + so3 : so1 + so2 + so3
    const phien = {
        room: room,
        time: new Date(),
        result: result,
        le: result % 2 === 1,
        chan: result % 2 === 0,
        lon: result > 15,
        nho: result < 15,
        id: Math.floor(Math.random() * 1000000),
        result_money: 0,
        so1: so1,
        so2: so2,
        so3: so3,
        active: true,
        result_lon_nho: result > 15 ? 'Lớn' : 'Nhỏ',
        result_chan_le: result % 2 === 0 ? 'Chẵn' : 'Lẻ',
        users: []
    }

    io.emit('123', '23')

    return phien
}

const startPhienSoCap = () => {
    const phien = createPhien('so-cap')
    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if(time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            // update số dư cho ngiười chơi nếu trúng thuong
            // lấy ra tất cả người chơi trong phiên

            phien.users.forEach(user => {
                db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                    if (error) {
                        console.log('error.message', error.message)
                    }
                    if (results.length === 0) {
                        return
                    }
                    const user = results[0]
                    // db.query('UPDATE users SET balance = ? WHERE id = ?', [user.balance + user.result_money, user.id], function (error, results, fields) {
                    //     if (error) {
                    //         console.log('error.message', error.message)
                    //     }
                    // })
                    // kểm tra xem user có trúng thưởng không trong bảng lotos

                    db.query('SELECT * FROM lotos WHERE user_id = ? AND phien_id = ?', [user.id, phien.id], function (error, results, fields) {
                        if (error) {
                            console.log('error.message', error.message)
                        }
                        if (results.length === 0) {
                            return
                        }
                        const lotos = results[0]
                        if (lotos.result_money > 0) {
                            db.query('UPDATE users SET balance = ? WHERE id = ?', [user.balance + lotos.result_money, user.id], function (error, results, fields) {
                                if (error) {
                                    console.log('error.message', error.message)
                                }
                                // trả socket về client cho user id
                                // lấy ra số tiền của user hiện tại sau khi update
                                db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                                    if (error) {
                                        console.log('error.message', error.message)
                                    }
                                    const user = results[0]
                                    io.emit(`user-${user.id}`, {
                                        message: `Chúc mừng bạn đã trúng thưởng ${lotos.result_money} vào phiên ${phien.id}`,
                                        balance: user.balance
                                    })
                                })
                            })
                        } else {
                            // trả socket về client cho user id
                            // lấy ra số tiền của user hiện tại sau khi update
                            db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                                if (error) {
                                    console.log('error.message', error.message)
                                }
                                const user = results[0]
                                io.emit(`user-${user.id}`, {
                                    message: `Rất tiếc bạn đã không trúng thưởng vào phiên ${phien.id}`,
                                    balance: user.balance
                                })
                            })
                        }
                    })
                })
            })
            startPhienSoCap()
            console.log('phien', phien)
        }

        // create user aảo trong phien
        const user = {
            id: Math.random().toString(36).substring(7),
            money: Math.floor(Math.random() * 100000) * 100,
            wanfa: `D@${Math.floor(Math.random() * 27)}`,
            // random từ 2tr đến 100tr
            result_money: Math.floor(Math.random() * 100000),
            // username: 'user' + Math.floor(Math.random() * 100),
            //user name random ky tu
            username: Math.random().toString(36).substring(7),
            time: new Date().toISOString().substr(11, 8)
        }
        setTimeout(() => {
            phien.users.push(user)
        }, Math.floor(Math.random() * 5000))
        io.emit('so-cap', phien)

    }, 1000)
}
const startPhienTrungCap = () => {
    const phien = createPhien('trung-cap')

    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if(time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            startPhienTrungCap()
            console.log('phien', phien)
        }

        // create user aảo trong phien
        const user = {
            id: Math.random().toString(36).substring(7),
            money: Math.floor(Math.random() * 100000) * 100,
            wanfa: `D@${Math.floor(Math.random() * 27)}`,
            // random từ 2tr đến 100tr
            result_money: Math.floor(Math.random() * 100000),
            // username: 'user' + Math.floor(Math.random() * 100),
            //user name random ky tu
            username: Math.random().toString(36).substring(7),
            time: new Date().toISOString().substr(11, 8)
        }
        setTimeout(() => {
            phien.users.push(user)
        }, Math.floor(Math.random() * 5000))
        io.emit('trung-cap', phien)

    }, 1000)
}

const startPhienCaoCap = () => {
    const phien = createPhien('trung-cap')

    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if(time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            startPhienCaoCap()
            console.log('phien', phien)
        }

        // create user aảo trong phien
        const user = {
            id: Math.random().toString(36).substring(7),
            money: Math.floor(Math.random() * 100000) * 100,
            wanfa: `D@${Math.floor(Math.random() * 27)}`,
            // random từ 2tr đến 100tr
            result_money: Math.floor(Math.random() * 100000),
            // username: 'user' + Math.floor(Math.random() * 100),
            //user name random ky tu
            username: Math.random().toString(36).substring(7),
            time: new Date().toISOString().substr(11, 8)
        }
        setTimeout(() => {
            phien.users.push(user)
        }, Math.floor(Math.random() * 5000))
        io.emit('cao-cap', phien)

    }, 1000)
}


const startPhienVip = () => {
    const phien = createPhien('vip')

    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if(time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            startPhienVip()
            console.log('phien', phien)
        }

        // create user aảo trong phien
        const user = {
            id: Math.random().toString(36).substring(7),
            money: Math.floor(Math.random() * 100000) * 100,
            wanfa: `D@${Math.floor(Math.random() * 27)}`,
            // random từ 2tr đến 100tr
            result_money: Math.floor(Math.random() * 100000),
            // username: 'user' + Math.floor(Math.random() * 100),
            //user name random ky tu
            username: Math.random().toString(36).substring(7),
            time: new Date().toISOString().substr(11, 8)
        }
        setTimeout(() => {
            phien.users.push(user)
        }, Math.floor(Math.random() * 5000))
        io.emit('vip', phien)

    }, 1000)
}


startPhienSoCap()
startPhienTrungCap()
startPhienCaoCap()
startPhienVip()

const corsOpts = {
    origin: '*',

    methods: [
        'GET',
        'POST',
    ],

    allowedHeaders: [
        'Content-Type',
    ],
};

app.use(cors(corsOpts));
app.post('/dat-cuoc', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    let {id, room, money, wanfa, result_money, phien_id} = req.body
    console.log(id, room, money, wanfa, result_money, phien_id)

    // lấy ra phien


    const roomName = room

    const min = room_prefix[roomName].min
    const max = room_prefix[roomName].max

    money = parseFloat(money)

    console.log(min, max, money)


    console.log(min, max, money)

    if(money < min || money > max) {
        console.log('Số tiền cược phải từ', min, 'đến', max)
        return res.status(400).json({message: `Số tiền cược phải từ ${min} đến ${max}`})
    }
    db.query('SELECT * FROM users WHERE id = ?', [id], function (error, results, fields) {

        if (error) {
            console.log('error.message', error.message)
            return res.status(500).json({message: error.message})
        }
        console.log('results', results)
        if (results.length === 0) {
            return res.status(404).json({message: 'user not found'})
        }
        const user = results[0]
        if (user.balance < money) {
            return res.status(400).json({ message: 'Số dư không đủ để đặt cược' })
        }
        db.query('UPDATE users SET balance = ? WHERE id = ?', [user.balance - money, id], function (error, results, fields) {
            if (error) {
                return res.status(500).json({message: error.message})
            }
            db.query('INSERT INTO lotos (user_id, room, money, wanfan, result_money, phien_id) VALUES (?, ?, ?, ?, ?, ?)', [id, roomName, money, wanfa, result_money, phien_id], function (error, results, fields) {
                if (error) {
                    console.log('error', error)
                    return res.status(500).json({message: error.message})
                }

                // trả về socket số tiền còn lại của user
                db.query('SELECT * FROM users WHERE id = ?', [id], function (error, results, fields) {
                    if (error) {
                        console.log('error.message', error.message)
                        return res.status(500).json({message: error.message})
                    }
                    const user = results[0]
                    io.emit(`user-${user.id}`, {
                        message: `Bạn đã đặt cược thành công ${money} vào phiên ${phien_id}`,
                        balance: user.balance,
                    })
                })

                const phien = phiens.find(p => p.id == phien_id && p.active)
                console.log('phien', phien)
                if (!phien) {
                    return res.status(400).json({message: 'Phiên cược không tồn tại hoặc đã kết thúc'})
                }

                phien.users.push({
                    id: id,
                    money: money,
                    wanfa: wanfa,
                    result_money: result_money,
                    username: user.username,
                    time: new Date().toISOString().substr(11, 8)
                })
                return res.status(200).json({message: 'Đặt cược thành công'})
            })
        })
    })

})

// admin get all phien
app.get('/phien', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({phiens: phiens})
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})