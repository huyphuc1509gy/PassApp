import React, { useEffect, useState, useContext } from 'react';
import {
    Container, Row, Col, Card, CardBody, CardTitle,
    Button, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input, Alert, Spinner, ListGroup, ListGroupItem,
    InputGroup, InputGroupText
} from 'reactstrap';
import CryptoJS from 'crypto-js';
import zxcvbn from 'zxcvbn'; 
import { 
    Plus, KeyRound, LogOut, Trash2, Copy, Shield, ShieldCheck, 
    Globe, User, Lock, Search, X, Check, Save, AlertTriangle, Eye, EyeOff
} from 'lucide-react';

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
    
    // UI States
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewPass, setShowNewPass] = useState(false); // Toggle show password in modal

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

    // Add pass
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
                const keysFromOldPass = deriveKeys(user.email, oldPass); // Assuming user object has email
                
                if (keysFromOldPass.encKey !== encKey) {
                    alert("Incorrect old password!");
                    setChangingPass(false);
                    return; 
                }
                
                // Create new key
                const { authKey: newAuthKey, encKey: newEncKey } = deriveKeys(user.email, passData.newPass);

                // Encrypt again all data
                const newEncryptedData = encryptVault(vaultData, newEncKey);

                // Create new backup
                const randomPin = generateRandomPin();
                const newBackupKeyHash = BackupKey(passData.newPass, randomPin, user.email);

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
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Có thể thêm toast notification ở đây
    };

    // Filter items based on search
    const filteredVault = vaultData.filter(item => 
        item.site.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (error) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", background: "#f8f9fa" }}>
            <Alert color="danger" className="text-center shadow-sm border-0 rounded-3 p-4" fade={false}>
                <AlertTriangle size={48} className="mb-3 text-danger"/>
                <h5 className="alert-heading">Access Error</h5>
                <p>{error}</p>
                <Button color="outline-danger" size="sm" className="mt-2" onClick={logout}>Back to Login</Button>
            </Alert>
        </Container>
    );

    return (
        <div className="min-vh-100 bg-light pb-5">
            {/* Navbar / Header Area */}
            <div className="bg-white border-bottom shadow-sm sticky-top mb-4">
                <Container>
                    <div className="d-flex justify-content-between align-items-center py-3">
                        <div className="d-flex align-items-center gap-2">
                            <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                                <ShieldCheck className="text-primary" size={24} />
                            </div>
                            <div>
                                <h5 className="mb-0 fw-bold text-primary">My Vault</h5>
                                <small className="text-muted d-none d-sm-block">Secure Password Manager</small>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                             <Button color="light" className="text-danger border-0" size="sm" onClick={logout}>
                                <LogOut size={18} className="me-1"/> <span className="d-none d-sm-inline">Exit</span>
                            </Button>
                        </div>
                    </div>
                </Container>
            </div>

            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} lg={10} xl={8}>
                        <Card className="shadow-lg border-0 rounded-4 overflow-hidden" style={{ minHeight: '600px' }}>
                            <CardBody className="p-0 d-flex flex-column">
                                
                                {/* Toolbar */}
                                <div className="p-4 bg-white border-bottom">
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                                        <div className="position-relative flex-grow-1">
                                            <Search className="position-absolute text-muted" size={18} style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                            <Input 
                                                type="text" 
                                                placeholder="Search vault..." 
                                                className="ps-5 bg-light border-0" 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="d-flex gap-2">
                                            {!isDeleteMode && (
                                                <>
                                                    <Button color="primary" className="d-flex align-items-center gap-2 shadow-sm fw-medium px-3" onClick={toggleModal}>
                                                        <Plus size={18} /> <span className="d-none d-sm-inline">Add New</span>
                                                    </Button>
                                                    <Button color="light" className="text-primary border d-flex align-items-center gap-2 shadow-sm px-3" onClick={togglePassModal}>
                                                        <KeyRound size={18} />
                                                    </Button>
                                                </>
                                            )}
                                            <Button 
                                                color={isDeleteMode ? "secondary" : "danger"} 
                                                outline={!isDeleteMode}
                                                className="d-flex align-items-center gap-2 px-3" 
                                                onClick={toggleDeleteMode} 
                                                disabled={vaultData.length === 0}
                                            >
                                                {isDeleteMode ? <Check size={18}/> : <Trash2 size={18} />}
                                                <span className="d-none d-sm-inline">{isDeleteMode ? "Done" : "Edit"}</span>
                                            </Button>
                                        </div>
                                    </div>
                                    {isDeleteMode && (
                                        <Alert color="danger" className="mt-3 mb-0 py-2 d-flex align-items-center gap-2 small rounded-3">
                                            <AlertTriangle size={16}/> Delete Mode Active: Click trash icon to remove items permanently.
                                        </Alert>
                                    )}
                                </div>

                                {/* List Content */}
                                <div className="flex-grow-1 bg-light bg-opacity-25" style={{ overflowY: 'auto', maxHeight: '600px' }}>
                                    {loading ? (
                                        <div className="text-center py-5">
                                            <Spinner color="primary" />
                                            <p className="mt-3 text-muted">Decrypting your vault...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {vaultData.length === 0 ? (
                                                <div className="text-center text-muted py-5 mt-4">
                                                    <div className="bg-white p-4 rounded-circle shadow-sm d-inline-block mb-3">
                                                        <Shield size={48} className="text-muted opacity-50"/>
                                                    </div>
                                                    <h5 className="fw-bold text-dark">Your vault is empty</h5>
                                                    <p className="text-muted mb-4">Start securing your passwords today.</p>
                                                    {!isDeleteMode && (
                                                        <Button color="primary" outline onClick={toggleModal}>
                                                            Add first password
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-3">
                                                    {filteredVault.length === 0 && searchTerm ? (
                                                        <div className="text-center py-5 text-muted">No results found for "{searchTerm}"</div>
                                                    ) : (
                                                        <ListGroup className="shadow-sm rounded-3 overflow-hidden">
                                                            {filteredVault.map((item, index) => (
                                                                <ListGroupItem key={index} className="p-3 border-0 border-bottom list-group-item-action d-flex align-items-center gap-3">
                                                                    <div className="bg-primary bg-opacity-10 p-3 rounded-3 d-flex align-items-center justify-content-center" style={{width: '50px', height: '50px'}}>
                                                                        <Globe className="text-primary" size={24} />
                                                                    </div>
                                                                    
                                                                    <div className="flex-grow-1 overflow-hidden">
                                                                        <h6 className="fw-bold text-dark mb-1 text-truncate">{item.site}</h6>
                                                                        <div className="text-muted small text-truncate d-flex align-items-center gap-1">
                                                                            <User size={12}/> {item.username}
                                                                        </div>
                                                                    </div>

                                                                    <div className="d-flex align-items-center gap-2">
                                                                        {isDeleteMode ? (
                                                                            <Button color="danger" outline size="sm" className="rounded-circle p-2" onClick={() => handleDelete(index)}>
                                                                                <Trash2 size={16}/>
                                                                            </Button>
                                                                        ) : (
                                                                            <Button 
                                                                                color="light" 
                                                                                className="text-primary border-0 bg-white shadow-sm rounded-pill px-3 fw-medium d-flex align-items-center gap-2" 
                                                                                size="sm" 
                                                                                onClick={() => copyToClipboard(item.password)}
                                                                                title="Copy Password"
                                                                            >
                                                                                <Copy size={14}/> <span className="d-none d-md-inline">Copy</span>
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </ListGroupItem>
                                                            ))}
                                                        </ListGroup>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* MODAL Add Password */}
                <Modal isOpen={modalOpen} toggle={toggleModal} centered size="md" backdrop="static">
                    <ModalHeader toggle={toggleModal} className="border-0 pb-0">Add New Password</ModalHeader>
                    <ModalBody className="p-4">
                        <Form>
                            <FormGroup className="mb-3">
                                <Label className="small fw-bold text-secondary text-uppercase">Website / App Name</Label>
                                <InputGroup>
                                    <InputGroupText className="bg-light border-end-0"><Globe size={18} className="text-muted"/></InputGroupText>
                                    <Input 
                                        className="border-start-0 bg-light" 
                                        placeholder="e.g. Facebook, Gmail..."
                                        value={newItem.site} 
                                        onChange={e => setNewItem({ ...newItem, site: e.target.value })} 
                                    />
                                </InputGroup>
                            </FormGroup>
                            <FormGroup className="mb-3">
                                <Label className="small fw-bold text-secondary text-uppercase">Username / Email</Label>
                                <InputGroup>
                                    <InputGroupText className="bg-light border-end-0"><User size={18} className="text-muted"/></InputGroupText>
                                    <Input 
                                        className="border-start-0 bg-light" 
                                        placeholder="user@example.com"
                                        value={newItem.username} 
                                        onChange={e => setNewItem({ ...newItem, username: e.target.value })} 
                                    />
                                </InputGroup>
                            </FormGroup>
                            <FormGroup className="mb-3">
                                <Label className="small fw-bold text-secondary text-uppercase">Password</Label>
                                <InputGroup>
                                    <InputGroupText className="bg-light border-end-0"><Lock size={18} className="text-muted"/></InputGroupText>
                                    <Input 
                                        type={showNewPass ? "text" : "password"}
                                        className="border-start-0 border-end-0 bg-light" 
                                        placeholder="••••••••"
                                        value={newItem.password} 
                                        onChange={e => setNewItem({ ...newItem, password: e.target.value })} 
                                    />
                                    <InputGroupText className="bg-light border-start-0 cursor-pointer" onClick={() => setShowNewPass(!showNewPass)}>
                                        {showNewPass ? <EyeOff size={18} className="text-muted"/> : <Eye size={18} className="text-muted"/>}
                                    </InputGroupText>
                                </InputGroup>
                            </FormGroup>
                        </Form>
                    </ModalBody>
                    <ModalFooter className="border-0 pt-0 px-4 pb-4">
                        <Button color="light" className="text-muted border-0" onClick={toggleModal}>Cancel</Button>
                        <Button color="primary" className="px-4 fw-bold" onClick={handleSave} disabled={saving}>
                            {saving ? <Spinner size="sm" /> : "Save Password"}
                        </Button>
                    </ModalFooter>
                </Modal>

                {/* Modal Change Master Password */}
                <Modal isOpen={passModal} toggle={togglePassModal} centered size="md" backdrop="static">
                    <ModalHeader className={`border-0 ${newPin ? "bg-success text-white" : ""}`}>
                        {newPin ? "Password Changed Successfully!" : "Change Master Password"}
                    </ModalHeader>
                    <ModalBody className="p-4">
                        {!newPin ? (
                            <Form>
                                <Alert color="warning" className="d-flex gap-2 small border-0 bg-warning bg-opacity-10 text-dark rounded-3 mb-4" fade={false}>
                                    <AlertTriangle size={20} className="text-warning flex-shrink-0"/>
                                    <div>
                                        <strong>Warning:</strong> Changing your master password will re-encrypt your entire vault. This process cannot be undone.
                                    </div>
                                </Alert>
                                
                                <FormGroup className="mb-3">
                                    <Label className="small fw-bold text-secondary text-uppercase">Current Password</Label>
                                    <Input 
                                        type="password" 
                                        className="bg-light border-0 py-2"
                                        value={oldPass} 
                                        onChange={e => setOldPass(e.target.value)} 
                                        placeholder="Enter current password..."
                                    />
                                </FormGroup>

                                <hr className="my-4 text-muted opacity-25"/>

                                <FormGroup className="mb-3">
                                    <Label className="small fw-bold text-secondary text-uppercase">New Password</Label>
                                    <Input 
                                        type="password" 
                                        className="bg-light border-0 py-2"
                                        value={passData.newPass} 
                                        onChange={handlePasswordChange} 
                                        placeholder="Enter new password..."
                                    />
                                    {/* Score */}
                                    {passData.newPass && (
                                        <div className="progress mt-2" style={{height: '4px'}}>
                                            <div 
                                                className={`progress-bar bg-${['danger','danger','warning','info','success'][score]}`} 
                                                style={{width: `${(score+1)*20}%`}}
                                            ></div>
                                        </div>
                                    )}
                                </FormGroup>
                                <FormGroup>
                                    <Label className="small fw-bold text-secondary text-uppercase">Confirm New Password</Label>
                                    <Input 
                                        type="password" 
                                        className="bg-light border-0 py-2"
                                        value={passData.confirmPass} 
                                        onChange={e => setPassData({ ...passData, confirmPass: e.target.value })} 
                                        placeholder="Retype new password..."
                                    />
                                </FormGroup>
                            </Form>
                        ) : (
                            <div className="text-center py-3">
                                <div className="bg-success bg-opacity-10 p-3 rounded-circle d-inline-block mb-3">
                                    <Check size={48} className="text-success"/>
                                </div>
                                <h4 className="fw-bold text-dark">Success!</h4>
                                <p className="text-muted mb-4">Your Master Password has been updated.</p>
                                
                                <p className="fw-bold text-danger small text-uppercase letter-spacing-1 mb-2">New Recovery PIN</p>
                                <div className="display-6 font-monospace border border-dashed border-danger border-opacity-25 p-3 bg-danger bg-opacity-10 rounded text-danger mb-4 fw-bold">
                                    {newPin}
                                </div>
                                <Alert color="info" className="text-start small border-0 bg-info bg-opacity-10 text-dark rounded-3">
                                    <span className="fw-bold">Important:</span> Your old Recovery PIN is now invalid. Please save this new code in a secure location immediately.
                                </Alert>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="border-0 pt-0 px-4 pb-4 justify-content-center">
                        {!newPin ? (
                            <div className="d-flex gap-2 w-100 justify-content-end">
                                <Button color="light" className="text-muted border-0" onClick={togglePassModal} disabled={changingPass}>Cancel</Button>
                                <Button color="primary" className="px-4 fw-bold" onClick={handleChangePassword} disabled={changingPass}>
                                    {changingPass ? <Spinner size="sm" /> : "Confirm Change"}
                                </Button>
                            </div>
                        ) : (
                            <Button color="primary" size="lg" block className="w-100 fw-bold" onClick={logout}>
                                I Saved It - Logout Now
                            </Button>
                        )}
                    </ModalFooter>
                </Modal>
            </Container>
        </div>
    );
};

export default Dashboard;