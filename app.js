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
        users: [],
    }

    return phien

}

const startPhienSoCap = () => {
    const phien = createPhien('so-cap')
    if (phien == null) {
        return
    }
    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if (time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)

            phien.users.forEach(user => {
                db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                    if (error) {
                        console.log('error.message', error.message)
                    }
                    if (results.length === 0) {
                        return
                    }
                    const user = results[0]

                    db.query('SELECT * FROM lotos WHERE user_id = ? AND phien_id = ?', [user.id, phien.id], function (error, results, fields) {
                        if (error) {
                            console.log('error.message', error.message)
                        }
                        if (results.length === 0) {
                            return
                        }
                        const lotos = results[0]
                        // loto.wanfa = DA@Lớn@2.02|X@Nhỏ@2.02
                        // phân tích wanfa xem người chơi đặt cược vào chản hay lẻ và lớn nhỏ
                        const wanfa = lotos.wanfan.split('|')
                        let result_money = 0

                        if (wanfa.length == 2) {
                            // check xem người chơi có đặt cược vào cả 2 chẵn và lẻ không
                            // neu nguoi choi dat ca 2 chẵn và lẻ thì tiền cược sẽ được + 12%
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            // lấy ra kết quả của phiên
                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    // hồi lại tiền cược và thêm 12% tiền cược
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            }
                        } else if (wanfa.length == 1) {
                            const w = wanfa[0]
                            const wans = w.split('@')
                            const type = wans[0]
                            const value = wans[1]
                            const rate = parseFloat(wans[2])
                            if (value === 'Lớn' && phien.result > 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Nhỏ' && phien.result < 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Chẵn' && phien.result % 2 === 0) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Lẻ' && phien.result % 2 === 1) {
                                result_money = lotos.result_money * rate
                            }
                        } else if (wanfa.length === 4) {
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            const w3 = wanfa[2]
                            const wans3 = w3.split('@')
                            const type3 = wans3[0]
                            const value3 = wans3[1]
                            const rate3 = parseFloat(wans3[2])
                            const w4 = wanfa[3]
                            const wans4 = w4.split('@')
                            const type4 = wans4[0]
                            const value4 = wans4[1]
                            const rate4 = parseFloat(wans4[2])

                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.money

                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                            }
                        }
                        console.log(user.balance + result_money)
                        const balance = user.balance + result_money
                        console.log('balance', balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                        if (lotos.result_money > 0 && result_money > 0) {
                            db.query('UPDATE users SET balance = ? WHERE id = ?', [balance, user.id], function (error, results, fields) {
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
                                        message: `Chúc mừng bạn đã trúng thưởng ${result_money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
                                        balance: balance
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
                                    balance: user.balance + result_money
                                })
                            })
                        }
                    })
                })
            })
            startPhienSoCap()
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
    if (phien == null) {
        return
    }
    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if (time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            phien.users.forEach(user => {
                db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                    if (error) {
                        console.log('error.message', error.message)
                    }
                    if (results.length === 0) {
                        return
                    }
                    const user = results[0]

                    db.query('SELECT * FROM lotos WHERE user_id = ? AND phien_id = ?', [user.id, phien.id], function (error, results, fields) {
                        if (error) {
                            console.log('error.message', error.message)
                        }
                        if (results.length === 0) {
                            return
                        }
                        const lotos = results[0]
                        // loto.wanfa = DA@Lớn@2.02|X@Nhỏ@2.02
                        // phân tích wanfa xem người chơi đặt cược vào chản hay lẻ và lớn nhỏ
                        const wanfa = lotos.wanfan.split('|')
                        let result_money = 0

                        if (wanfa.length == 2) {
                            // check xem người chơi có đặt cược vào cả 2 chẵn và lẻ không
                            // neu nguoi choi dat ca 2 chẵn và lẻ thì tiền cược sẽ được + 12%
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            // lấy ra kết quả của phiên
                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    // hồi lại tiền cược và thêm 12% tiền cược
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            }
                        } else if (wanfa.length == 1) {
                            const w = wanfa[0]
                            const wans = w.split('@')
                            const type = wans[0]
                            const value = wans[1]
                            const rate = parseFloat(wans[2])
                            if (value === 'Lớn' && phien.result > 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Nhỏ' && phien.result < 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Chẵn' && phien.result % 2 === 0) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Lẻ' && phien.result % 2 === 1) {
                                result_money = lotos.result_money * rate
                            }
                        } else if (wanfa.length === 4) {
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            const w3 = wanfa[2]
                            const wans3 = w3.split('@')
                            const type3 = wans3[0]
                            const value3 = wans3[1]
                            const rate3 = parseFloat(wans3[2])
                            const w4 = wanfa[3]
                            const wans4 = w4.split('@')
                            const type4 = wans4[0]
                            const value4 = wans4[1]
                            const rate4 = parseFloat(wans4[2])

                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.money

                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                            }
                        }
                        console.log(user.balance + result_money)
                        const balance = user.balance + result_money
                        console.log('balance', balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                        if (lotos.result_money > 0 && result_money > 0) {
                            db.query('UPDATE users SET balance = ? WHERE id = ?', [balance, user.id], function (error, results, fields) {
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
                                        message: `Chúc mừng bạn đã trúng thưởng ${result_money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
                                        balance: balance
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
                                    balance: user.balance + result_money
                                })
                            })
                        }
                    })
                })
            })
            startPhienTrungCap()
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
    if (phien == null) {
        return
    }
    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if (time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            phien.users.forEach(user => {
                db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                    if (error) {
                        console.log('error.message', error.message)
                    }
                    if (results.length === 0) {
                        return
                    }
                    const user = results[0]

                    db.query('SELECT * FROM lotos WHERE user_id = ? AND phien_id = ?', [user.id, phien.id], function (error, results, fields) {
                        if (error) {
                            console.log('error.message', error.message)
                        }
                        if (results.length === 0) {
                            return
                        }
                        const lotos = results[0]
                        // loto.wanfa = DA@Lớn@2.02|X@Nhỏ@2.02
                        // phân tích wanfa xem người chơi đặt cược vào chản hay lẻ và lớn nhỏ
                        const wanfa = lotos.wanfan.split('|')
                        let result_money = 0

                        if (wanfa.length == 2) {
                            // check xem người chơi có đặt cược vào cả 2 chẵn và lẻ không
                            // neu nguoi choi dat ca 2 chẵn và lẻ thì tiền cược sẽ được + 12%
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            // lấy ra kết quả của phiên
                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    // hồi lại tiền cược và thêm 12% tiền cược
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            }
                        } else if (wanfa.length == 1) {
                            const w = wanfa[0]
                            const wans = w.split('@')
                            const type = wans[0]
                            const value = wans[1]
                            const rate = parseFloat(wans[2])
                            if (value === 'Lớn' && phien.result > 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Nhỏ' && phien.result < 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Chẵn' && phien.result % 2 === 0) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Lẻ' && phien.result % 2 === 1) {
                                result_money = lotos.result_money * rate
                            }
                        } else if (wanfa.length === 4) {
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            const w3 = wanfa[2]
                            const wans3 = w3.split('@')
                            const type3 = wans3[0]
                            const value3 = wans3[1]
                            const rate3 = parseFloat(wans3[2])
                            const w4 = wanfa[3]
                            const wans4 = w4.split('@')
                            const type4 = wans4[0]
                            const value4 = wans4[1]
                            const rate4 = parseFloat(wans4[2])

                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.money

                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                            }
                        }
                        console.log(user.balance + result_money)
                        const balance = user.balance + result_money
                        console.log('balance', balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                        if (lotos.result_money > 0 && result_money > 0) {
                            db.query('UPDATE users SET balance = ? WHERE id = ?', [balance, user.id], function (error, results, fields) {
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
                                        message: `Chúc mừng bạn đã trúng thưởng ${result_money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
                                        balance: balance
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
                                    balance: user.balance + result_money
                                })
                            })
                        }
                    })
                })
            })
            startPhienCaoCap()
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
    if (phien == null) {
        return
    }
    const minute = 1
    const time = minute * 60 * 1000
    phiens.push(phien)
    let a = setInterval(() => {
        const now = new Date()
        const diff = now - phien.time
        // tính ra thời gian còn lại của phiên xút ra time_text tr về dạng phut:giay
        const time_text = new Date(time - diff).toISOString().substr(14, 5)
        if (time_text === '59:59') {
            phien.time_text = '00:00'
        }

        phien.time_text = time_text
        // neu phien ket thuc
        if (diff > time) {
            phien.active = false
            clearInterval(a)
            phien.users.forEach(user => {
                db.query('SELECT * FROM users WHERE id = ?', [user.id], function (error, results, fields) {
                    if (error) {
                        console.log('error.message', error.message)
                    }
                    if (results.length === 0) {
                        return
                    }
                    const user = results[0]

                    db.query('SELECT * FROM lotos WHERE user_id = ? AND phien_id = ?', [user.id, phien.id], function (error, results, fields) {
                        if (error) {
                            console.log('error.message', error.message)
                        }
                        if (results.length === 0) {
                            return
                        }
                        const lotos = results[0]
                        // loto.wanfa = DA@Lớn@2.02|X@Nhỏ@2.02
                        // phân tích wanfa xem người chơi đặt cược vào chản hay lẻ và lớn nhỏ
                        const wanfa = lotos.wanfan.split('|')
                        let result_money = 0

                        if (wanfa.length == 2) {
                            // check xem người chơi có đặt cược vào cả 2 chẵn và lẻ không
                            // neu nguoi choi dat ca 2 chẵn và lẻ thì tiền cược sẽ được + 12%
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            // lấy ra kết quả của phiên
                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    // hồi lại tiền cược và thêm 12% tiền cược
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                                if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }
                            }
                        } else if (wanfa.length == 1) {
                            const w = wanfa[0]
                            const wans = w.split('@')
                            const type = wans[0]
                            const value = wans[1]
                            const rate = parseFloat(wans[2])
                            if (value === 'Lớn' && phien.result > 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Nhỏ' && phien.result < 15) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Chẵn' && phien.result % 2 === 0) {
                                result_money = lotos.result_money * rate
                            }
                            if (value === 'Lẻ' && phien.result % 2 === 1) {
                                result_money = lotos.result_money * rate
                            }
                        } else if (wanfa.length === 4) {
                            const w1 = wanfa[0]
                            const wans1 = w1.split('@')
                            const type1 = wans1[0]
                            const value1 = wans1[1]
                            const rate1 = parseFloat(wans1[2])
                            const w2 = wanfa[1]
                            const wans2 = w2.split('@')
                            const type2 = wans2[0]
                            const value2 = wans2[1]
                            const rate2 = parseFloat(wans2[2])
                            const w3 = wanfa[2]
                            const wans3 = w3.split('@')
                            const type3 = wans3[0]
                            const value3 = wans3[1]
                            const rate3 = parseFloat(wans3[2])
                            const w4 = wanfa[3]
                            const wans4 = w4.split('@')
                            const type4 = wans4[0]
                            const value4 = wans4[1]
                            const rate4 = parseFloat(wans4[2])

                            const rate_chan_le = 1.95
                            const rate_lon_nho = 2.02

                            if (phien.result > 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result > 15 && phien.result % 2 === 1) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }


                            } else if (phien.result < 15 && phien.result % 2 === 0) {
                                if (value1 === 'Lớn' && value2 === 'Nhỏ' || value1 === 'Nhỏ' && value2 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value2 === 'Lẻ' || value1 === 'Lẻ' && value2 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Lớn' && value4 === 'Nhỏ' || value3 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value3 === 'Chẵn' && value4 === 'Lẻ' || value3 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.money

                                } else if (value1 === 'Lớn' && value3 === 'Nhỏ' || value1 === 'Nhỏ' && value3 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value1 === 'Chẵn' && value3 === 'Lẻ' || value1 === 'Lẻ' && value3 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Lớn' && value4 === 'Nhỏ' || value2 === 'Nhỏ' && value4 === 'Lớn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                } else if (value2 === 'Chẵn' && value4 === 'Lẻ' || value2 === 'Lẻ' && value4 === 'Chẵn') {
                                    result_money = lotos.result_money * rate_lon_nho / 100 * 12 + lotos.result_money
                                }

                            }
                        }
                        console.log(user.balance + result_money)
                        const balance = user.balance + result_money
                        console.log('balance', balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
                        if (lotos.result_money > 0 && result_money > 0) {
                            db.query('UPDATE users SET balance = ? WHERE id = ?', [balance, user.id], function (error, results, fields) {
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
                                        message: `Chúc mừng bạn đã trúng thưởng ${result_money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
                                        balance: balance
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
                                    balance: user.balance + result_money
                                })
                            })
                        }
                    })
                })
            })
            startPhienVip()
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

    const roomName = room

    const min = room_prefix[roomName].min * 1000
    const max = room_prefix[roomName].max * 1000

    money = parseFloat(money)
    result_money = parseFloat(result_money)

    if (money < min || money > max) {
        return res.status(400).json({message: `Số tiền cược phải từ ${min} đến ${max}`})
    }
    db.query('SELECT * FROM users WHERE id = ?', [id], function (error, results, fields) {

        if (error) {
            console.log('error.message', error.message)
            return res.status(500).json({message: error.message})
        }
        if (results.length === 0) {
            return res.status(404).json({message: 'user not found'})
        }
        const user = results[0]
        if (user.balance < money) {
            return res.status(400).json({message: 'Số dư không đủ để đặt cược'})
        }
        const total = user.balance - result_money
        db.query('UPDATE users SET balance = ? WHERE id = ?', [total, id], function (error, results, fields) {
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
                        message: `Bạn đã đặt cược thành công ${result_money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
                        balance: total,
                    })
                })

                const phien = phiens.find(p => p.id == phien_id && p.active)
                if (!phien) {
                    return res.status(400).json({message: 'Phiên cược không tồn tại hoặc đã kết thúc'})
                }

                phien.users.push({
                    id: id,
                    money: money,
                    wanfa: wanfa,
                    result_money: result_money,
                    username: user.username,
                    time: new Date().toISOString().substr(11, 8),
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