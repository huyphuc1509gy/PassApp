import React, { useEffect, useState, useContext } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardTitle,
    Button, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input, Alert, Spinner, ListGroup, ListGroupItem
} from 'reactstrap';
import CryptoJS from 'crypto-js';
import zxcvbn from 'zxcvbn'; 

import { AuthContext } from '../contexts/AuthContext';
import api from '../api';
import { decryptVault, encryptVault, deriveKeys, BackupKey, generateRandomPin } from '../utils/crypto';

const Dashboard = () => {
    const { user, encKey, logout } = useContext(AuthContext);

    const [vaultData, setVaultData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // State Add
    const [modalOpen, setModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ site: '', username: '', password: '' });
    const [saving, setSaving] = useState(false);

    // State Pass changing
    const [passModal, setPassModal] = useState(false);
    const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });
    const [oldPass, setOldPass] = useState(''); 
    const [changingPass, setChangingPass] = useState(false);
    const [newPin, setNewPin] = useState(null);
    const [score, setScore] = useState(0); 
    
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!encKey) return;
            setLoading(true);
            try {
                const res = await api.get('/vault');
                const encryptedString = res.data.encrypted_data || res.data.encryptedData;
                if (!encryptedString) {
                    setVaultData([]);
                } else {
                    const decrypted = decryptVault(encryptedString, encKey);
                    if (decrypted) setVaultData(decrypted);
                }
            } catch (err) {
                console.error(err);
                setError("Unable to load data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [encKey]);

    // 2. SAVE DATA (THÊM MỚI)
    const handleSave = async () => {
        if (!newItem.site || !newItem.password) return;
        setSaving(true);
        try {
            const updatedVault = [...vaultData, newItem];
            const newEncryptedString = encryptVault(updatedVault, encKey);
            await api.put('/vault', { encrypted_data: newEncryptedString });
            setVaultData(updatedVault);
            setModalOpen(false);
            setNewItem({ site: '', username: '', password: '' });
        } catch (err) {
            alert("Error saving data!");
        } finally {
            setSaving(false);
        }
    };

    // Check Socre
    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassData({ ...passData, newPass: val });
        if (val) {
            const result = zxcvbn(val);
            setScore(result.score);
        } else {
            setScore(0);
        }
    }

    // Change pass
    const handleChangePassword = async () => {
        if (!passData.newPass || !passData.confirmPass || !oldPass) {
            alert("Please fill in all fields!");
            return;
        }
        if (passData.newPass !== passData.confirmPass) {
            alert("Passwords do not match!");
            return;
        }
        if (score < 2) {
            alert("New password is too weak! Please add numbers or special characters.");
            return;
        }

        setChangingPass(true);
        setTimeout(async () => {
            try {
                const email = user.email;

                // --- KIỂM TRA MẬT KHẨU CŨ (CLIENT-SIDE CHECK) ---
                // Tạo thử encKey từ mật khẩu cũ người dùng nhập
                // Lưu ý: Hàm deriveKeys trả về {authKey, encKey}
                const keysFromOldPass = deriveKeys(email, oldPass); 
                
                // So sánh encKey vừa tạo với encKey thật trong Context
                if (keysFromOldPass.encKey !== encKey) {
                    alert("Incorrect old password!");
                    setChangingPass(false);
                    return; 
                }

                // --- NẾU MẬT KHẨU CŨ ĐÚNG -> TIẾN HÀNH ĐỔI ---
                
                // 1. Tạo bộ khóa mới từ mật khẩu MỚI
                const { authKey: newAuthKey, encKey: newEncKey } = deriveKeys(email, passData.newPass);

                // 2. Mã hóa lại Vault hiện tại bằng encKey MỚI
                const newEncryptedData = encryptVault(vaultData, newEncKey);

                // 3. Tạo Backup PIN mới
                const randomPin = generateRandomPin();
                const newBackupKeyHash = BackupKey(passData.newPass, randomPin, email);

                // 4. Gửi lên API (Dùng route change-password thay vì reset)
                // Lưu ý: Route backend phải là /auth/change-password hoặc tương tự
                await api.post('/auth/change-password', {
                    newAuthKey: newAuthKey,
                    newEncryptedData: newEncryptedData,
                    newBackupKeyHash: newBackupKeyHash
                });

                // Thành công
                setNewPin(randomPin);

            } catch (err) {
                console.error(err);
                alert("Password change failed: " + (err.response?.data?.message || err.message));
                setChangingPass(false);
            }
        }, 100);
    }

    // Delete item
    const handleDelete = async (indexToDelete) => {
        if (!window.confirm(`Are you sure you want to delete password for "${vaultData[indexToDelete].site}"?`)) return;
        setLoading(true);
        try {
            const updatedVault = vaultData.filter((_, index) => index !== indexToDelete);
            const newEncryptedString = encryptVault(updatedVault, encKey);
            await api.put('/vault', { encrypted_data: newEncryptedString });
            setVaultData(updatedVault);
            if (updatedVault.length === 0) setIsDeleteMode(false);
        } catch (err) {
            alert("Error deleting data!");
        } finally {
            setLoading(false);
        }
    };

    const toggleModal = () => setModalOpen(!modalOpen);
    const togglePassModal = () => {
        setPassModal(!passModal);
        setNewPin(null);
        setPassData({ newPass: '', confirmPass: '' });
        setOldPass('');
        setScore(0);
        setChangingPass(false);
    };
    const toggleDeleteMode = () => setIsDeleteMode(!isDeleteMode);
    const copyToClipboard = (text) => navigator.clipboard.writeText(text);

    if (error) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
            <Alert color="danger" className="text-center shadow-sm" fade={false}>
                {error} <br /> <Button size="sm" className="mt-2" onClick={logout}>Logout</Button>
            </Alert>
        </Container>
    );

    return (
        <Container className="d-flex justify-content-center align-items-start pt-4" style={{ minHeight: "100vh", }}>
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                    <Card className="shadow-sm border-0 w-100" style={{ minWidth: "420px" }}>
                        <CardBody className="p-0 d-flex flex-column">

                            <div className="p-4 bg-white border-bottom d-flex justify-content-between align-items-center sticky-top" style={{ borderTopLeftRadius: '.375rem', borderTopRightRadius: '.375rem', zIndex: 10 }}>
                                <div>
                                    <CardTitle tag="h4" className="text-primary fw-bold mb-0">My Vault</CardTitle>
                                    <small className="text-muted">
                                        {isDeleteMode ? <span className="text-danger fw-bold">DELETE MODE</span> : "Safe & Secure"}
                                    </small>
                                </div>
                                <div>
                                    {!isDeleteMode && (
                                        <>
                                            <Button color="primary" size="sm" className="me-2 shadow-sm" onClick={toggleModal}>+ Add</Button>
                                            <Button color="info" outline size="sm" className="me-1 shadow-sm" onClick={togglePassModal} title="Change Password">Change</Button>
                                        </>
                                    )}
                                    <Button color={isDeleteMode ? "secondary" : "warning"} size="sm" className="me-2 shadow-sm text-white" onClick={toggleDeleteMode} disabled={vaultData.length === 0}>
                                        {isDeleteMode ? "Done" : "Delete"}
                                    </Button>
                                    <Button outline color="danger" size="sm" onClick={logout}>Exit</Button>
                                </div>
                            </div>

                            {/* List  */}
                            <div className="flex-grow-1 p-0" style={{ overflowY: 'auto' }}>
                                {loading ? (
                                    <div className="text-center py-5"><Spinner color="primary" /><p className="mt-2 text-muted">Processing...</p></div>
                                ) : (
                                    <>
                                        {vaultData.length === 0 ? (
                                            <div className="text-center text-muted py-5 mt-4">
                                                <div style={{ fontSize: '3rem' }}>📭</div>
                                                <p className="mt-3">Vault is empty.</p>
                                                {!isDeleteMode && <Button color="link" onClick={toggleModal}>Add first password</Button>}
                                            </div>
                                        ) : (
                                            <ListGroup flush>
                                                {vaultData.map((item, index) => (
                                                    <ListGroupItem key={index} className="p-3 border-bottom list-group-item-action">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div style={{ width: '75%' }}>
                                                                <div className="fw-bold text-dark text-truncate" style={{ fontSize: '1.1rem' }}>{item.site}</div>
                                                                <div className="text-muted small text-truncate">👤 {item.username}</div>
                                                            </div>
                                                            {isDeleteMode ? (
                                                                <Button color="danger" size="sm" className="shadow-sm rounded-pill px-3" onClick={() => handleDelete(index)}>Del</Button>
                                                            ) : (
                                                                <Button color="light" className="text-primary border shadow-sm rounded-pill px-3" size="sm" onClick={() => copyToClipboard(item.password)}>Copy</Button>
                                                            )}
                                                        </div>
                                                    </ListGroupItem>
                                                ))}
                                            </ListGroup>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* MODAL Add */}
            <Modal isOpen={modalOpen} toggle={toggleModal} centered size="sm" backdrop="static">
                <ModalHeader toggle={toggleModal}>Add Password</ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup><Label className="small fw-bold">Site/App</Label><Input value={newItem.site} onChange={e => setNewItem({ ...newItem, site: e.target.value })} /></FormGroup>
                        <FormGroup><Label className="small fw-bold">Username</Label><Input value={newItem.username} onChange={e => setNewItem({ ...newItem, username: e.target.value })} /></FormGroup>
                        <FormGroup><Label className="small fw-bold">Password</Label><Input type="password" value={newItem.password} onChange={e => setNewItem({ ...newItem, password: e.target.value })} /></FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter className="p-2">
                    <Button color="secondary" size="sm" onClick={toggleModal}>Cancel</Button>
                    <Button color="primary" size="sm" onClick={handleSave} disabled={saving}>{saving ? <Spinner size="sm" /> : "Save"}</Button>
                </ModalFooter>
            </Modal>

            {/* Modal change Pass */}
            <Modal isOpen={passModal} toggle={togglePassModal} centered size="sm" backdrop="static">
                <ModalHeader className={newPin ? "bg-success text-white" : "bg-info text-white"}>
                    {newPin ? "Password Changed Successfully!" : "Change Master Password"}
                </ModalHeader>
                <ModalBody>
                    {!newPin ? (
                        <Form>
                            <Alert color="warning" style={{ fontSize: '0.8rem'} }  fade={false}>
                                <strong>Note:</strong> Data will be re-encrypted. This may take a few seconds.
                            </Alert>
                            
                            <FormGroup>
                                <Label className="small fw-bold text-danger">Old Password</Label>
                                <Input 
                                    type="password" 
                                    value={oldPass} 
                                    onChange={e => setOldPass(e.target.value)} 
                                    placeholder="Enter current password..."
                                />
                            </FormGroup>

                            <hr/>

                            <FormGroup>
                                <Label className="small fw-bold">New Password</Label>
                                <Input 
                                    type="password" 
                                    value={passData.newPass} 
                                    onChange={handlePasswordChange} 
                                    placeholder="Enter new password..."
                                />
                                {/* Score */}
                                {passData.newPass && (
                                    <div className="progress mt-1" style={{height: '5px'}}>
                                        <div 
                                            className={`progress-bar bg-${['danger','danger','warning','info','success'][score]}`} 
                                            style={{width: `${(score+1)*20}%`}}
                                        ></div>
                                    </div>
                                )}
                            </FormGroup>
                            <FormGroup>
                                <Label className="small fw-bold">Confirm New Password</Label>
                                <Input type="password" value={passData.confirmPass} onChange={e => setPassData({ ...passData, confirmPass: e.target.value })} />
                            </FormGroup>
                        </Form>
                    ) : (
                        <div className="text-center">
                            <p>Password has been changed.</p>
                            <p className="fw-bold text-danger">YOUR NEW RECOVERY PIN:</p>
                            <div className="display-4 font-monospace border p-2 bg-light rounded text-primary my-3">
                                {newPin}
                            </div>
                            <Alert color="danger" className="text-start small" fade={false}>
                                Old PIN is now invalid. Save this code immediately!
                            </Alert>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter className="p-2">
                    {!newPin ? (
                        <>
                            <Button color="secondary" size="sm" onClick={togglePassModal} disabled={changingPass}>Cancel</Button>
                            <Button color="primary" size="sm" onClick={handleChangePassword} disabled={changingPass}>
                                {changingPass ? <Spinner size="sm" /> : "Confirm Change"}
                            </Button>
                        </>
                    ) : (
                        <Button color="success" block onClick={logout}>
                            Logout & Re-login
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </Container>
    );
};

export default Dashboard;