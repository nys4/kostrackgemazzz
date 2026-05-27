import { db, auth } from "./firebase/firebaseConfig";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
  });

  const [transactions, setTransactions] = useState([]);

  const [incomeForm, setIncomeForm] = useState({
    name: "",
    amount: "",
    date: "",
    note: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    category: "Makan & Minum",
    date: "",
    mood: "Biasa",
    note: "",
  });

  const [budgets, setBudgets] = useState([]);

  const [budgetForm, setBudgetForm] = useState({
    category: "Makan & Minum",
    limit: "",
  });

  const [editingBudget, setEditingBudget] =
    useState(null);

  const [wishlist, setWishlist] = useState([]);

  const [wishlistForm, setWishlistForm] = useState({
    name: "",
    price: "",
    saved: "",
    priority: "Kebutuhan",
  });

  const categories = [
    "Makan & Minum",
    "Transportasi",
    "Hiburan",
    "Belanja",
    "Kebutuhan Kost",
    "Kuliah",
    "Laundry",
    "Lainnya",
  ];

  const moods = ["Senang", "Stres", "Lapar", "Ikut Teman", "Bosan", "Biasa"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await fetchTransactions(currentUser.uid);
        await fetchBudgets(currentUser.uid);
        await fetchWishlists(currentUser.uid);
      } else {
        setTransactions([]);
        setBudgets([]);
        setWishlist([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchTransactions = async (userId) => {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map((item) => ({
      firebaseId: item.id,
      ...item.data(),
    }));

    setTransactions(data);
  };

  const fetchBudgets = async (userId) => {
    const q = query(
      collection(db, "budgets"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map((item) => ({
      firebaseId: item.id,
      ...item.data(),
    }));

    setBudgets(data);
  };

  const fetchWishlists = async (userId) => {
    const q = query(
      collection(db, "wishlists"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);

    const data = querySnapshot.docs.map((item) => ({
      firebaseId: item.id,
      ...item.data(),
    }));

    setWishlist(data);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await createUserWithEmailAndPassword(
        auth,
        authForm.email,
        authForm.password
      );

      alert("Register berhasil");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(
        auth,
        authForm.email,
        authForm.password
      );

      alert("Login berhasil");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPage("dashboard");
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number || 0);
  };

  const totalIncome = useMemo(() => {
    return transactions
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + Number(item.amount), 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((item) => item.type === "expense")
      .reduce((total, item) => total + Number(item.amount), 0);
  }, [transactions]);

  const balance = totalIncome - totalExpense;
  const totalBudget = budgets.reduce(
    (sum, item) => sum + Number(item.limit),
    0

  );

  const remainingBudget = balance - totalBudget;

  const expenseByCategory = useMemo(() => {
    return categories
      .map((category) => {
        const total = transactions
          .filter((item) => item.type === "expense" && item.category === category)
          .reduce((sum, item) => sum + Number(item.amount), 0);

        return { category, total };
      })
      .filter((item) => item.total > 0);
  }, [transactions]);

  const biggestCategory = useMemo(() => {
    if (expenseByCategory.length === 0) return null;
    return [...expenseByCategory].sort((a, b) => b.total - a.total)[0];
  }, [expenseByCategory]);

  const prediction = useMemo(() => {
    const today = new Date();
    const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const remainingDays = totalDays - currentDay;
    const dailySafeLimit = remainingDays > 0 ? balance / remainingDays : balance;
    const dailyAverageExpense = currentDay > 0 ? totalExpense / currentDay : 0;

    let status = "Aman sampai akhir bulan";
    let className = "green";

    if (dailyAverageExpense > dailySafeLimit && totalExpense > 0) {
      status = "Berisiko habis sebelum akhir bulan";
      className = "red";
    } else if (dailyAverageExpense > dailySafeLimit * 0.75 && totalExpense > 0) {
      status = "Perlu mulai hemat";
      className = "yellow";
    }

    return {
      status,
      className,
      remainingDays,
      dailySafeLimit,
      dailyAverageExpense,
    };
  }, [balance, totalExpense]);

  const savingTip = useMemo(() => {
    if (!biggestCategory) return "Belum ada pengeluaran. Pertahankan kebiasaan hemat kamu.";

    if (biggestCategory.category === "Makan & Minum") {
      return "Pengeluaran makan cukup besar. Coba masak sendiri 2 sampai 3 kali seminggu.";
    }

    if (biggestCategory.category === "Hiburan") {
      return "Pengeluaran hiburan cukup tinggi. Coba kurangi nongkrong minggu ini.";
    }

    if (biggestCategory.category === "Transportasi") {
      return "Transportasi cukup besar. Coba gabungkan perjalanan agar ongkos lebih hemat.";
    }

    if (biggestCategory.category === "Belanja") {
      return "Belanja cukup besar. Tunda barang yang belum terlalu dibutuhkan.";
    }

    return `Pengeluaran terbesar ada di kategori ${biggestCategory.category}. Coba buat batas harian agar lebih terkontrol.`;
  }, [biggestCategory]);

  const impulsiveAlert = useMemo(() => {
    const expenseTransactions = transactions.filter((item) => item.type === "expense");

    if (expenseTransactions.length === 0) {
      return {
        message: "Belum ada pengeluaran yang perlu dianalisis.",
        detail: "Tambahkan pengeluaran harian dulu agar fitur ini bisa mendeteksi kebiasaan boros.",
      };
    }

    const biggestTransaction = [...expenseTransactions].sort((a, b) => b.amount - a.amount)[0];
    const biggestCategoryPercent = biggestCategory
      ? Math.round((biggestCategory.total / totalExpense) * 100)
      : 0;
    const biggestTransactionPercent = balance > 0
      ? Math.round((biggestTransaction.amount / balance) * 100)
      : 100;

    if (biggestTransactionPercent >= 25) {
      return {
        message: `Pengeluaran ${biggestTransaction.name} cukup besar, sekitar ${biggestTransactionPercent}% dari saldo saat ini.`,
        detail: `Transaksi terbesar kamu adalah ${biggestTransaction.name} sebesar ${formatRupiah(biggestTransaction.amount)}. Saran aplikasi: tunda pembelian besar berikutnya dan buat batas belanja harian.`,
      };
    }

    if (biggestCategory && biggestCategoryPercent >= 40) {
      return {
        message: `Kategori ${biggestCategory.category} mendominasi ${biggestCategoryPercent}% dari total pengeluaran.`,
        detail: `Pengeluaran terbesar ada di kategori ${biggestCategory.category}, yaitu ${formatRupiah(biggestCategory.total)}. Saran aplikasi: kurangi pengeluaran di kategori ini.`,
      };
    }

    return {
      message: "Pengeluaran masih terlihat aman. Belum ada tanda impulsif yang tinggi.",
      detail: "Dari data transaksi saat ini, belum ada kategori atau transaksi yang terlalu dominan.",
    };
  }, [transactions, balance, totalExpense, biggestCategory]);

  const topMoodData = useMemo(() => {
    const moodTotals = {};

    transactions
      .filter(
        (item) =>
          item.type === "expense" &&
          item.mood &&
          item.mood !== "-"
      )
      .forEach((item) => {
        if (!moodTotals[item.mood]) {
          moodTotals[item.mood] = 0;
        }

        moodTotals[item.mood] += Number(item.amount);
      });

    const totalExpenseMood = Object.values(
      moodTotals
    ).reduce((a, b) => a + b, 0);

    if (totalExpenseMood === 0) {
      return {
        mood: "Belum ada data mood",
        percent: 0,
      };
    }

    const topMood = Object.entries(moodTotals).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      mood: topMood[0],
      percent: Math.round(
        (topMood[1] / totalExpenseMood) * 100
      ),
    };
  }, [transactions]);

  const addIncome = async (e) => {
    e.preventDefault();

    if (!incomeForm.name || !incomeForm.amount || !incomeForm.date) return;

    const newTransaction = {
      userId: user.uid,
      id: Date.now(),
      type: "income",
      name: incomeForm.name,
      amount: Number(incomeForm.amount),
      category: "Pemasukan",
      date: incomeForm.date,
      mood: "-",
      note: incomeForm.note,
    };

    const docRef = await addDoc(collection(db, "transactions"), newTransaction);

    setTransactions([{ firebaseId: docRef.id, ...newTransaction }, ...transactions]);

    setIncomeForm({ name: "", amount: "", date: "", note: "" });
    setPage("dashboard");
  };

  const addExpense = async (e) => {
    e.preventDefault();

    if (!expenseForm.name || !expenseForm.amount || !expenseForm.date) return;

    const newTransaction = {
      userId: user.uid,
      id: Date.now(),
      type: "expense",
      name: expenseForm.name,
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      date: expenseForm.date,
      mood: expenseForm.mood,
      note: expenseForm.note,
    };

    const docRef = await addDoc(collection(db, "transactions"), newTransaction);

    setTransactions([{ firebaseId: docRef.id, ...newTransaction }, ...transactions]);

    setExpenseForm({
      name: "",
      amount: "",
      category: "Makan & Minum",
      date: "",
      mood: "Biasa",
      note: "",
    });

    setPage("dashboard");
  };

  const deleteTransaction = async (item) => {
    if (item.firebaseId) {
      await deleteDoc(doc(db, "transactions", item.firebaseId));
    }

    setTransactions(transactions.filter((trx) => trx.id !== item.id));
  };

  const addBudget = async (e) => {
    e.preventDefault();

    if (!budgetForm.category || !budgetForm.limit)
      return;

    if (editingBudget) {
      const budgetToEdit = budgets.find(
        (item) => item.id === editingBudget
      );

      if (budgetToEdit?.firebaseId) {
        await updateDoc(
          doc(
            db,
            "budgets",
            budgetToEdit.firebaseId
          ),
          {
            limit: Number(budgetForm.limit),
          }
        );
      }

      setBudgets(
        budgets.map((item) =>
          item.id === editingBudget
            ? {
              ...item,
              limit: Number(budgetForm.limit),
            }
            : item
        )
      );

      setEditingBudget(null);
    } else {
      const existingBudget = budgets.find(
        (item) =>
          item.category === budgetForm.category
      );

      if (existingBudget) {
        alert("Budget kategori ini sudah ada");
        return;
      }

      const newBudget = {
        userId: user.uid,
        id: Date.now(),
        category: budgetForm.category,
        limit: Number(budgetForm.limit),
      };

      const docRef = await addDoc(
        collection(db, "budgets"),
        newBudget
      );

      setBudgets([
        {
          firebaseId: docRef.id,
          ...newBudget,
        },
        ...budgets,
      ]);
    }

    setBudgetForm({
      category: "Makan & Minum",
      limit: "",
    });
  };

  const deleteBudget = async (
    id,
    firebaseId
  ) => {
    if (firebaseId) {
      await deleteDoc(
        doc(db, "budgets", firebaseId)
      );
    }

    setBudgets(
      budgets.filter(
        (budget) => budget.id !== id
      )
    );
  };

  const addWishlist = async (e) => {
    e.preventDefault();

    if (!wishlistForm.name || !wishlistForm.price) return;

    const sameItem = wishlist.find(
      (item) =>
        item.name.toLowerCase().trim() ===
        wishlistForm.name.toLowerCase().trim() &&
        Number(item.price) === Number(wishlistForm.price)
    );

    if (sameItem) {
      const newSaved = Math.min(
        Number(sameItem.saved) + Number(wishlistForm.saved || 0),
        Number(sameItem.price)
      );

      if (sameItem.firebaseId) {
        await updateDoc(doc(db, "wishlists", sameItem.firebaseId), {
          saved: newSaved,
          priority: wishlistForm.priority,
        });
      }

      setWishlist(
        wishlist.map((item) =>
          item.id === sameItem.id
            ? {
              ...item,
              saved: newSaved,
              priority: wishlistForm.priority,
            }
            : item
        )
      );
    } else {
      const newWishlist = {
        userId: user.uid,
        id: Date.now(),
        name: wishlistForm.name,
        price: Number(wishlistForm.price),
        saved: Number(wishlistForm.saved || 0),
        priority: wishlistForm.priority,
      };

      const docRef = await addDoc(
        collection(db, "wishlists"),
        newWishlist
      );

      setWishlist([
        {
          firebaseId: docRef.id,
          ...newWishlist,
        },
        ...wishlist,
      ]);
    }

    setWishlistForm({
      name: "",
      price: "",
      saved: "",
      priority: "Kebutuhan",
    });
  };

  const deleteWishlist = async (id, firebaseId) => {
    if (firebaseId) {
      await deleteDoc(doc(db, "wishlists", firebaseId));
    }

    setWishlist(wishlist.filter((item) => item.id !== id));
  };

  if (!user) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />

      <main className="main">
        <Header user={user} handleLogout={handleLogout} />

        {page === "dashboard" && (
          <Dashboard
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
            remainingBudget={remainingBudget}
            expenseByCategory={expenseByCategory}
            prediction={prediction}
            savingTip={savingTip}
            impulsiveAlert={impulsiveAlert}
            topMood={topMoodData}
            transactions={transactions}
            wishlist={wishlist}
            setPage={setPage}
            formatRupiah={formatRupiah}
          />
        )}

        {page === "income" && (
          <IncomePage
            incomeForm={incomeForm}
            setIncomeForm={setIncomeForm}
            addIncome={addIncome}
          />
        )}

        {page === "expense" && (
          <ExpensePage
            expenseForm={expenseForm}
            setExpenseForm={setExpenseForm}
            addExpense={addExpense}
            categories={categories}
            moods={moods}
          />
        )}

        {page === "budget" && (
          <BudgetPage
            budgets={budgets}
            budgetForm={budgetForm}
            setBudgetForm={setBudgetForm}
            addBudget={addBudget}
            deleteBudget={deleteBudget}
            categories={categories}
            transactions={transactions}
            formatRupiah={formatRupiah}
            editingBudget={editingBudget}
            setEditingBudget={setEditingBudget}
          />
        )}

        {page === "wishlist" && (
          <WishlistPage
            wishlist={wishlist}
            wishlistForm={wishlistForm}
            setWishlistForm={setWishlistForm}
            addWishlist={addWishlist}
            deleteWishlist={deleteWishlist}
            formatRupiah={formatRupiah}
          />
        )}

        {page === "history" && (
          <HistoryPage
            transactions={transactions}
            deleteTransaction={deleteTransaction}
            formatRupiah={formatRupiah}
          />
        )}
      </main>
    </div>
  );
}

function AuthPage({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  handleLogin,
  handleRegister,
}) {
  const isLogin = authMode === "login";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Kostrack</h1>
        <p>Smart Budgeting for Anak Kost</p>

        <h2>{isLogin ? "Login" : "Register"}</h2>

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          <label>Email</label>
          <input
            type="email"
            value={authForm.email}
            onChange={(e) =>
              setAuthForm({ ...authForm, email: e.target.value })
            }
            placeholder="Masukkan email"
          />

          <label>Password</label>
          <input
            type="password"
            value={authForm.password}
            onChange={(e) =>
              setAuthForm({ ...authForm, password: e.target.value })
            }
            placeholder="Masukkan password"
          />

          <button className="primary-btn">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <button
          className="switch-auth-btn"
          onClick={() => setAuthMode(isLogin ? "register" : "login")}
        >
          {isLogin
            ? "Belum punya akun? Register"
            : "Sudah punya akun? Login"}
        </button>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage }) {
  const menus = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "income", label: "Pemasukan", icon: "💵" },
    { id: "expense", label: "Pengeluaran", icon: "💸" },
    { id: "budget", label: "Budget Plan", icon: "📅" },
    { id: "wishlist", label: "Wishlist", icon: "💜" },
    { id: "history", label: "Riwayat Transaksi", icon: "🕒" },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-box">
        <div className="logo-icon">👛</div>
        <div>
          <h1>Kostrack</h1>
          <p>Smart Budgeting for Anak Kost</p>
        </div>
      </div>

      <nav className="menu">
        {menus.map((menu) => (
          <button
            key={menu.id}
            className={page === menu.id ? "menu-item active" : "menu-item"}
            onClick={() => setPage(menu.id)}
          >
            <span>{menu.icon}</span>
            {menu.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-card">
        <div className="student-emoji">🧑‍🎓</div>
        <h3>Kelola uangmu, capai tujuanmu!</h3>
        <p>Kostrack membantu kamu lebih hemat dan teratur.</p>
      </div>
    </aside>
  );
}

function Header({ user, handleLogout }) {
  return (
    <header className="header">
      <div>
        <h2>Hi, {user?.email?.split("@")[0]}! 👋</h2>
        <p>Yuk, kelola keuangan kost kamu hari ini.</p>
      </div>

      <div className="profile-box">
        <div className="avatar">🙂</div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

function Dashboard({
  totalIncome,
  totalExpense,
  balance,
  remainingBudget,
  expenseByCategory,
  prediction,
  savingTip,
  topMood,
  transactions,
  wishlist,
  setPage,
  formatRupiah,
}) {
  const [impulseForm, setImpulseForm] = useState({
    itemName: "",
    itemPrice: "",
  });

  const [impulseCart, setImpulseCart] = useState(() => {
    const savedCart = localStorage.getItem("impulseCart");

    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem(
      "impulseCart",
      JSON.stringify(impulseCart)
    );
  }, [impulseCart]);

  const [challengeForm, setChallengeForm] = useState({
    title: "",
    target: "",
  });

  const [challenges, setChallenges] = useState(() => {
    const savedChallenges =
      localStorage.getItem("challenges");

    return savedChallenges
      ? JSON.parse(savedChallenges)
      : [];
  });

  useEffect(() => {
    localStorage.setItem(
      "challenges",
      JSON.stringify(challenges)
    );
  }, [challenges]);

  const totalImpulse = impulseCart.reduce(
    (sum, item) => sum + Number(item.price),
    0
  );

  const impulseRemaining = balance - totalImpulse;

  const impulsePercent =
    balance > 0 ? (totalImpulse / balance) * 100 : 0;

  let impulseStatus = "Aman ✅";

  if (impulsePercent >= 30) {
    impulseStatus = "Impulsif Tinggi ⚠️";
  } else if (impulsePercent >= 15) {
    impulseStatus = "Perlu Dipikirkan 🤔";
  }

  const addImpulseItem = () => {
    if (!impulseForm.itemName || !impulseForm.itemPrice) return;

    const newItem = {
      id: Date.now(),
      name: impulseForm.itemName,
      price: Number(impulseForm.itemPrice),
    };

    setImpulseCart([...impulseCart, newItem]);

    setImpulseForm({
      itemName: "",
      itemPrice: "",
    });
  };

  const deleteImpulseItem = (id) => {
    setImpulseCart(impulseCart.filter((item) => item.id !== id));
  };

  const donutGradient =
    expenseByCategory.length > 0 && totalExpense > 0
      ? `conic-gradient(${expenseByCategory
        .map((item, index) => {
          const previousTotal = expenseByCategory
            .slice(0, index)
            .reduce((sum, cat) => sum + Number(cat.total), 0);

          const start = (previousTotal / totalExpense) * 100;
          const end =
            ((previousTotal + Number(item.total)) / totalExpense) * 100;

          return `${categoryColors[item.category] || "#94a3b8"} ${start}% ${end}%`;
        })
        .join(", ")})`
      : "#e5e7eb";

  const addChallenge = () => {
    if (!challengeForm.title || !challengeForm.target) return;

    const newChallenge = {
      id: Date.now(),
      title: challengeForm.title,
      target: Number(challengeForm.target),
      progress: 0,
      status: "Berjalan",
    };

    setChallenges([newChallenge, ...challenges]);

    setChallengeForm({
      title: "",
      target: "",
    });
  };

  const completeChallengeDay = (id) => {
    setChallenges(
      challenges.map((challenge) => {
        if (challenge.id === id && challenge.progress < challenge.target) {
          const newProgress = challenge.progress + 1;

          return {
            ...challenge,
            progress: newProgress,
            status: newProgress >= challenge.target ? "Selesai" : "Berjalan",
          };
        }

        return challenge;
      })
    );
  };

  const resetChallenge = (id) => {
    setChallenges(
      challenges.map((challenge) =>
        challenge.id === id
          ? { ...challenge, progress: 0, status: "Berjalan" }
          : challenge
      )
    );
  };

  const deleteChallenge = (id) => {
    setChallenges(challenges.filter((challenge) => challenge.id !== id));
  };

  return (
    <div className="dashboard-layout">
      <section className="content-left">
        <div className="summary-grid">
          <SummaryCard title="Saldo Saat Ini" value={formatRupiah(balance)} text="Dari total pemasukan bulan ini" color="purple" icon="👛" />
          <SummaryCard title="Total Pemasukan" value={formatRupiah(totalIncome)} text="Bulan ini" color="green" icon="📈" />
          <SummaryCard title="Total Pengeluaran" value={formatRupiah(totalExpense)} text="Bulan ini" color="red" icon="📉" />
          <SummaryCard title="Sisa Budget" value={formatRupiah(remainingBudget)} text="Saldo yang masih tersedia" color="blue" icon="💳" />
        </div>

        <section className="panel">
          <div className="panel-header">
            <h3>Ringkasan Bulan Ini</h3>
            <select>
              <option>Bulan Ini</option>
              <option>Minggu Ini</option>
            </select>
          </div>

          <div className="summary-section">
            <div
              className="donut"
              style={{
                background: donutGradient,
              }}
            >
              <div className="donut-center">
                <span>Total</span>
                <span>Pengeluaran</span>
                <strong>{formatRupiah(totalExpense)}</strong>
              </div>
            </div>

            <div className="category-list">
              {expenseByCategory.length === 0 && <p>Belum ada pengeluaran.</p>}

              {expenseByCategory.map((item) => (
                <div className="category-row" key={item.category}>
                  <span>
                    <span
                      className="category-dot"
                      style={{
                        background: categoryColors[item.category] || "#94a3b8",
                      }}
                    ></span>
                    {getCategoryIcon(item.category)} {item.category}
                  </span>

                  <strong>{formatRupiah(item.total)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel quick-actions">
          <h3>Aksi Cepat</h3>
          <div className="quick-grid">
            <button onClick={() => setPage("income")}>➕ Tambah Pemasukan</button>
            <button onClick={() => setPage("expense")}>➖ Tambah Pengeluaran</button>
            <button onClick={() => setPage("budget")}>📅 Lihat Budget Plan</button>
            <button onClick={() => setPage("wishlist")}>💜 Tambah Wishlist</button>
          </div>
        </section>

        <section className="insight-grid">
          <div className="insight-card">
            <h3>⚠️ Deteksi Pengeluaran Impulsif</h3>

            <p>Simulasikan barang yang ingin kamu beli sebelum checkout.</p>

            <input
              type="text"
              placeholder="Nama barang"
              value={impulseForm.itemName}
              onChange={(e) =>
                setImpulseForm({
                  ...impulseForm,
                  itemName: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Harga barang"
              value={impulseForm.itemPrice}
              onChange={(e) =>
                setImpulseForm({
                  ...impulseForm,
                  itemPrice: e.target.value,
                })
              }
            />

            <button className="primary-btn" onClick={addImpulseItem}>
              + Tambah ke Keranjang
            </button>

            <div className="impulse-cart">
              {impulseCart.length === 0 && <p>Keranjang masih kosong.</p>}

              {impulseCart.map((item) => (
                <div className="impulse-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{formatRupiah(item.price)}</p>
                  </div>

                  <button
                    className="trash-btn"
                    onClick={() => deleteImpulseItem(item.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="impulse-result">
              <p>
                <strong>Total keranjang:</strong><br />
                {formatRupiah(totalImpulse)}
              </p>

              <p>
                <strong>Sisa saldo:</strong><br />
                {formatRupiah(impulseRemaining)}
              </p>

              <p>
                <strong>Status:</strong><br />
                {impulseStatus}
              </p>
            </div>

            <small>Ini hanya simulasi. Tidak mengurangi saldo dashboard.</small>
          </div>

          <div className="insight-card">
            <h3>🏆 Challenge Mingguan</h3>

            <input
              type="text"
              placeholder="Nama challenge, contoh: No Nongkrong"
              value={challengeForm.title}
              onChange={(e) =>
                setChallengeForm({
                  ...challengeForm,
                  title: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Target hari"
              value={challengeForm.target}
              onChange={(e) =>
                setChallengeForm({
                  ...challengeForm,
                  target: e.target.value,
                })
              }
            />

            <button className="primary-btn" onClick={addChallenge}>
              + Tambah Challenge
            </button>

            <div className="challenge-list">
              {challenges.length === 0 && <p>Belum ada challenge.</p>}

              {challenges.map((challenge) => {
                const percent =
                  challenge.target > 0
                    ? (challenge.progress / challenge.target) * 100
                    : 0;

                const done = challenge.progress >= challenge.target;

                return (
                  <div className="challenge-box" key={challenge.id}>
                    <strong>{challenge.title}</strong>

                    <p>
                      Progress: {challenge.progress}/{challenge.target} hari
                    </p>

                    <div className="challenge-progress">
                      <div style={{ width: `${percent}%` }}></div>
                    </div>

                    <p>Status: {done ? "Selesai 🎉" : "Berjalan"}</p>

                    <div className="challenge-actions">

                      {!done && (
                        <button
                          className="challenge-icon-btn"
                          onClick={() =>
                            completeChallengeDay(challenge.id)
                          }
                          title="Hari ini berhasil"
                        >
                          ✓
                        </button>
                      )}

                      <button
                        className="challenge-icon-btn"
                        onClick={() =>
                          resetChallenge(challenge.id)
                        }
                        title="Reset"
                      >
                        ↻
                      </button>

                      <button
                        className="challenge-icon-btn"
                        onClick={() =>
                          deleteChallenge(challenge.id)
                        }
                        title="Hapus"
                      >
                        ✕
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          <div className="insight-card">
            <h3>🙂 Mood Spending Tracker</h3>

            <div className="mood-analysis">

              <h4>Mood paling sering:</h4>
              <p>
                <p>
                  Kamu paling sering mengeluarkan uang saat merasa{" "}
                  <strong>{topMood.mood}</strong> ({topMood.percent}%)
                </p>
              </p>

              {topMood.mood === "Stres" && (
                <div className="mood-warning">
                  ⚠️ Kamu sering belanja saat stres.
                  Coba hindari checkout ketika emosi sedang tidak stabil.
                </div>
              )}

              {topMood.mood === "Lapar" && (
                <div className="mood-warning">
                  🍔 Banyak pengeluaran terjadi saat lapar.
                  Coba makan dulu sebelum membuka aplikasi makanan.
                </div>
              )}

              {topMood.mood === "Ikut Teman" && (
                <div className="mood-warning">
                  👥 Kamu sering spending karena ikut teman.
                  Coba buat batas nongkrong mingguan.
                </div>
              )}

              {topMood.mood === "Bosan" && (
                <div className="mood-warning">
                  🎮 Pengeluaran karena bosan cukup tinggi.
                  Cari aktivitas gratis untuk mengurangi impulsive spending.
                </div>
              )}

              {topMood.mood === "Senang" && (
                <div className="mood-warning">
                  🎉 Kamu sering belanja saat sedang senang.
                  Tetap kontrol pengeluaran walaupun mood sedang bagus.
                </div>
              )}

              {topMood.mood === "Biasa" && (
                <div className="mood-warning">
                  👍 Pengeluaranmu cukup stabil dan tidak terlalu dipengaruhi emosi.
                </div>
              )}

            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Wishlist Kamu</h3>
            <button className="link-btn" onClick={() => setPage("wishlist")}>
              Lihat Semua
            </button>
          </div>

          <div className="wishlist-preview">
            {wishlist.slice(0, 3).map((item) => {
              const progress = Math.min((item.saved / item.price) * 100, 100);

              return (
                <div className="wishlist-mini" key={item.id}>
                  <span>🎯</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{formatRupiah(item.price)}</p>
                    <div className="progress-bar">
                      <div style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>

      <aside className="rightbar">
        <section className="panel prediction-card">
          <h3>Prediksi Akhir Bulan</h3>

          <div className={`status-box ${prediction.className}`}>
            <strong>{prediction.status}</strong>
            <p>Berdasarkan pola pengeluaranmu, uangmu dianalisis sampai akhir bulan.</p>
          </div>

          <InfoRow label="Rata-rata pengeluaran per hari" value={formatRupiah(prediction.dailyAverageExpense)} />
          <InfoRow label="Sisa hari bulan ini" value={`${prediction.remainingDays} hari`} />
          <InfoRow label="Batas aman per hari" value={formatRupiah(prediction.dailySafeLimit)} />
        </section>

        <section className="panel saving-card">
          <h3>Mode Anak Kost Hemat</h3>
          <div className="tip-box">
            <strong>Tips hemat untukmu:</strong>
            <p>{savingTip}</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Transaksi Terbaru</h3>
            <button className="link-btn" onClick={() => setPage("history")}>
              Lihat Semua
            </button>
          </div>

          <div className="transaction-list">
            {transactions.slice(0, 5).map((item) => (
              <div className="transaction-item" key={item.id}>
                <div className="transaction-icon">
                  {item.type === "income" ? "💵" : "🧾"}
                </div>

                <div>
                  <strong>{item.name}</strong>
                  <p>{item.category}</p>
                </div>

                <span className={item.type === "income" ? "amount income" : "amount expense"}>
                  {item.type === "income" ? "+" : "-"}{formatRupiah(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  text,
  color,
  icon,
}) {
  return (
    <div className={`summary-card ${color}`}>

      <div className="summary-top">
        <p>{title}</p>

        <div className="summary-icon">
          {icon}
        </div>
      </div>

      <h3>{value}</h3>

      <span>{text}</span>

    </div>
  );
}

function InsightCard({ title, icon, text, detail }) {
  const showDetail = () => {
    alert(`${title}\n\n${detail}`);
  };

  return (
    <div className="insight-card">
      <h3>{icon} {title}</h3>
      <p>{text}</p>
      <button onClick={showDetail}>Cek Detail</button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IncomePage({ incomeForm, setIncomeForm, addIncome }) {
  return (
    <section className="form-page">
      <div className="form-card">
        <h2>Tambah Pemasukan</h2>
        <p>Masukkan uang bulanan, gaji part time, atau pemasukan lain.</p>
        <form onSubmit={addIncome}>
          <label>Nama pemasukan</label>
          <input
            value={incomeForm.name}
            onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })}
            placeholder="Contoh: Uang bulanan"
          />

          <label>Jumlah</label>
          <input
            type="number"
            value={incomeForm.amount}
            onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
            placeholder="Contoh: 2000000"
          />

          <label>Tanggal</label>
          <input
            type="date"
            value={incomeForm.date}
            onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
          />

          <label>Catatan</label>
          <textarea
            value={incomeForm.note}
            onChange={(e) => setIncomeForm({ ...incomeForm, note: e.target.value })}
            placeholder="Catatan opsional"
          />

          <button className="primary-btn">Simpan Pemasukan</button>
        </form>
      </div>
    </section>
  );
}

function ExpensePage({ expenseForm, setExpenseForm, addExpense, categories, moods }) {
  return (
    <section className="form-page">
      <div className="form-card">
        <h2>Tambah Pengeluaran</h2>
        <p>Catat pengeluaran harian agar budget tetap terkontrol.</p>
        <form onSubmit={addExpense}>
          <label>Nama pengeluaran</label>
          <input
            value={expenseForm.name}
            onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
            placeholder="Contoh: Nasi Padang"
          />

          <label>Jumlah</label>
          <input
            type="number"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            placeholder="Contoh: 25000"
          />

          <label>Kategori</label>
          <select
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <label>Mood saat mengeluarkan uang</label>
          <select
            value={expenseForm.mood}
            onChange={(e) => setExpenseForm({ ...expenseForm, mood: e.target.value })}
          >
            {moods.map((mood) => (
              <option key={mood}>{mood}</option>
            ))}
          </select>

          <label>Tanggal</label>
          <input
            type="date"
            value={expenseForm.date}
            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
          />

          <label>Catatan</label>
          <textarea
            value={expenseForm.note}
            onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
            placeholder="Catatan opsional"
          />

          <button className="primary-btn">Simpan Pengeluaran</button>
        </form>
      </div>
    </section>
  );
}

function BudgetPage({ budgets, budgetForm, setBudgetForm, addBudget, deleteBudget, categories, transactions, formatRupiah, editingBudget, setEditingBudget, }) {
  return (
    <section className="page-section">
      <div className="page-title">
        <h2>Budget Plan</h2>
        <p>Atur batas pengeluaran per kategori.</p>
      </div>

      <div className="two-column">
        <div className="form-card small">
          <h3>Tambah atau Update Budget</h3>
          <form onSubmit={addBudget}>
            <label>Kategori</label>
            <select
              value={budgetForm.category}
              onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>

            <label>Limit Budget</label>
            <input
              type="number"
              value={budgetForm.limit}
              onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })}
              placeholder="Contoh: 800000"
            />

            <button className="primary-btn">Simpan Budget</button>
          </form>
        </div>

        <div className="panel">
          <h3>Daftar Budget</h3>
          <div className="budget-list">
            {budgets.map((budget) => {
              const used = transactions
                .filter((item) => item.type === "expense" && item.category === budget.category)
                .reduce((total, item) => total + item.amount, 0);
              const percent = Math.min((used / budget.limit) * 100, 100);

              return (
                <div className="budget-item" key={budget.id}>
                  <div>
                    <strong>{budget.category}</strong>
                    <p>{formatRupiah(used)} dari {formatRupiah(budget.limit)}</p>
                  </div>
                  <div className="progress-bar wide">
                    <div style={{ width: `${percent}%` }}></div>
                  </div>
                  {percent >= 80 && <span className="warning-text">Budget hampir habis</span>}
                  <button
                    type="button"
                    className="edit-budget-btn"
                    onClick={() => {
                      setBudgetForm({
                        category: budget.category,
                        limit: budget.limit,
                      });

                      setEditingBudget(budget.id);
                    }}
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    className="delete-budget-btn"
                    onClick={() =>
                      deleteBudget(
                        budget.id,
                        budget.firebaseId
                      )
                    }
                  >
                    Hapus Budget
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function WishlistPage({ wishlist, wishlistForm, setWishlistForm, addWishlist, deleteWishlist, formatRupiah }) {
  return (
    <section className="page-section">
      <div className="page-title">
        <h2>Wishlist</h2>
        <p>Catat barang yang ingin dibeli agar lebih terencana.</p>
      </div>

      <div className="two-column">
        <div className="form-card small">
          <h3>Tambah Wishlist</h3>
          <form onSubmit={addWishlist}>
            <label>Nama barang</label>
            <input
              value={wishlistForm.name}
              onChange={(e) => setWishlistForm({ ...wishlistForm, name: e.target.value })}
              placeholder="Contoh: Rice Cooker Mini"
            />

            <label>Harga barang</label>
            <input
              type="number"
              value={wishlistForm.price}
              onChange={(e) => setWishlistForm({ ...wishlistForm, price: e.target.value })}
              placeholder="Contoh: 250000"
            />

            <label>Uang yang sudah disiapkan</label>
            <input
              type="number"
              value={wishlistForm.saved}
              onChange={(e) => setWishlistForm({ ...wishlistForm, saved: e.target.value })}
              placeholder="Contoh: 50000"
            />

            <label>Prioritas</label>
            <select
              value={wishlistForm.priority}
              onChange={(e) => setWishlistForm({ ...wishlistForm, priority: e.target.value })}
            >
              <option>Kebutuhan</option>
              <option>Keinginan</option>
            </select>

            <button className="primary-btn">Tambah Wishlist</button>
          </form>
        </div>

        <div className="wishlist-grid-page">
          {wishlist.map((item) => {
            const progress = Math.min((item.saved / item.price) * 100, 100);
            return (
              <div className="wishlist-card" key={item.id}>
                <button className="delete-btn" onClick={() => deleteWishlist(item.id, item.firebaseId)}>×</button>
                <div className="wishlist-image">🎁</div>
                <h3>{item.name}</h3>
                <p>{item.priority}</p>
                <strong>{formatRupiah(item.price)}</strong>
                <span>Tabungan: {formatRupiah(item.saved)}</span>
                <div className="progress-bar wide">
                  <div style={{ width: `${progress}%` }}></div>
                </div>
                <small>{Math.round(progress)}% terkumpul</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HistoryPage({ transactions, deleteTransaction, formatRupiah }) {
  const [filter, setFilter] = useState("all");

  const filtered = transactions.filter((item) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  return (
    <section className="page-section">
      <div className="page-title">
        <h2>Riwayat Transaksi</h2>
        <p>Lihat semua pemasukan dan pengeluaran kamu.</p>
      </div>

      <div className="panel">
        <div className="filter-row">
          <button className={filter === "all" ? "active-filter" : ""} onClick={() => setFilter("all")}>Semua</button>
          <button className={filter === "income" ? "active-filter" : ""} onClick={() => setFilter("income")}>Pemasukan</button>
          <button className={filter === "expense" ? "active-filter" : ""} onClick={() => setFilter("expense")}>Pengeluaran</button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Mood</th>
                <th>Jumlah</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.mood}</td>
                  <td className={item.type === "income" ? "income" : "expense"}>
                    {item.type === "income" ? "+" : "-"}{formatRupiah(item.amount)}
                  </td>
                  <td>
                    <button className="table-delete" onClick={() => deleteTransaction(item)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const categoryColors = {
  "Makan & Minum": "#ef4444",
  Transportasi: "#38bdf8",
  Hiburan: "#fb7185",
  Belanja: "#22c55e",
  "Kebutuhan Kost": "#f59e0b",
  Kuliah: "#14b8a6",
  Laundry: "#c084fc",
  Lainnya: "#94a3b8",
};
function getCategoryIcon(category) {
  const icons = {
    "Makan & Minum": "🍽️",
    Transportasi: "🛵",
    Hiburan: "🎮",
    Belanja: "🛍️",
    "Kebutuhan Kost": "🏠",
    Kuliah: "📚",
    Laundry: "🧺",
    Lainnya: "📌",
  };

  return icons[category] || "📌";
}
