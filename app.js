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
        min: 2,
        max: 100
    },
    trung_cap: {
        name: 'so_chan',
        users: [],
        messages: [],
        min: 100,
        max: 500

    },
    cao_cap: {
        name: 'cao_cap',
        users: [],
        messages: [],
        min: 500,
        max: 2000
    },
    vip: {
        name: 'vip',
        users: [],
        messages: [],
        min: 2000,
        max: 100000
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
        id: Math.random().toString(36).substring(7),
        result_money: 0,
        so1: so1,
        so2: so2,
        so3: so3,
        active: true,
        result_text: result > 15 ? 'Lớn' : 'Nhỏ' + ' ' + result % 2 === 0 ? 'Chẵn' : 'Lẻ'
    }
    return phien
}

const startPhienSoCap = () => {
    const phien = createPhien('so_cap')
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        io.emit('so_cap', phien)
        console.log('phien', phien, diff, 5000 - diff)

        // neu phien ket thuc
        if (diff > 5000) {
            phien.active = false
            clearInterval(a)
            startPhienTrungCap(6000)
            console.log('phien', phien)
            io.emit('so_cap', phien)
        }
    }, 1000)
}
const startPhienTrungCap = (time) => {
    const phien = createPhien('trung_cap')
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        io.emit('trung_cap', phien)

        if (diff > time) {
            phien.active = false
            clearInterval(a)
            startPhienSoCap(time)
            console.log('phien', phien)
        }

        console.log('diff', diff, time - diff)
    }, 1000)
}

const startPhienCaoCap = (time) => {
    const phien = createPhien('cao_cap')
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        io.emit('cao_cap', phien)

        if (diff > time) {
            phien.active = false
            clearInterval(a)
            startPhienSoCap(time)
            console.log('phien', phien)
        }

        console.log('diff', diff, time - diff)
    }, 1000)

}

const startPhienVip = (time) => {
    const phien = createPhien('vip')
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        io.emit('vip', phien)

        if (diff > time) {
            phien.active = false
            clearInterval(a)
            startPhienSoCap(time)
            console.log('phien', phien)
        }
        console.log('diff', diff, time - diff)
    }, 1000)
}


startPhienSoCap('so_cap', 6000)
// startPhienTrungCap('trung_cap', 6000)
// startPhienCaoCap('cao_cap', 6000)
// startPhienVip('vip', 6000)

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
    let {id, room, money, wanfa, result_money} = req.body
    console.log(id, room, money, wanfa, result_money)

    const roomName = room

    const min = room_prefix[roomName].min
    const max = room_prefix[roomName].max

    money = parseInt(money)

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
            db.query('INSERT INTO lotos (user_id, room, money, wanfan, result_money) VALUES (?, ?, ?, ?, ?)', [id, roomName, money, wanfa, result_money], function (error, results, fields) {
                if (error) {
                    console.log('error', error)
                    return res.status(500).json({message: error.message})
                }
                return res.status(200).json({message: 'Đặt cược thành công'})
            })
        })
    })

})
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})