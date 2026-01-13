import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    Container, Row, Col, Card, CardBody, 
    Form, FormGroup, Label, Input, Button, Alert,
    Modal, ModalHeader, ModalBody, ModalFooter, 
    InputGroup, InputGroupText 
} from 'reactstrap';
import { 
    Mail, KeyRound, Hash, Lock, CheckCircle, Copy, ArrowLeft, Loader2, ShieldAlert
} from 'lucide-react'; 
import api from "../api";
import { RecoveryKey } from "../utils/crypto";

const Recovery = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [pin, setPin] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1); 
    const [recoveredPass, setRecoveredPass] = useState('');
    // 1. Email --> 2. OTP?PIN --> 3. Password

    // Get OTP func
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!email) {
            setError("Please enter your email!");
            return;
        }

        setLoading(true);
        try {
            await api.post("/auth/recovery/send-otp", { email });
            setStep(2); // OTP/PIN Modal
        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || "Error sending OTP. Please check your email.");
        } finally {
            setLoading(false);
        }
    };

    // Verify and Recover
    const handleVerifyAndRecover = async (e) => {
        e.preventDefault();
        setError('');

        if (!otp || !pin) {
            setError("Please enter both OTP and PIN!");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post("/auth/recovery/verify", { 
                email, 
                otp 
            });

            const { backupKeyHash } = res.data;

            if (!backupKeyHash) {
                throw new Error("Security backup not found.");
            }

            // Decode Backup --> Password
            const originalPassword = RecoveryKey(backupKeyHash, pin, email);

            if (originalPassword) {
                setRecoveredPass(originalPassword);
                setStep(3); 
            } else {
                setError("Incorrect PIN! Unable to decrypt.");
            }

        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || "Incorrect or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        navigate('/login');
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(recoveredPass);
        // Có thể thay bằng toast notification nếu có
        alert("Password copied!");
    };

    return (
        <div className="d-flex align-items-center min-vh-100 bg-light">
            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                        <Card className="shadow-lg border-0 rounded-4">
                            <CardBody className="p-5">
                                {/* Header Section */}
                                <div className="text-center mb-5">
                                    <div className="bg-warning bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
                                        <KeyRound className="text-warning" size={48} strokeWidth={1.5} />
                                    </div>
                                    <h2 className="fw-bold text-dark">Account Recovery</h2>
                                    <p className="text-muted">Enter your email to receive a One-Time Password</p>
                                </div>
                                
                                {/* Error */}
                                {step === 1 && error && (
                                    <Alert color="danger" className="d-flex align-items-center gap-2 border-0 bg-danger bg-opacity-10 text-danger rounded-3 mb-4">
                                        <ShieldAlert size={18} />
                                        <span>{error}</span>
                                    </Alert>
                                )}

                                <Form onSubmit={handleSendOtp}>
                                    <FormGroup className="mb-4">
                                        <Label for="email" className="fw-medium text-secondary small text-uppercase">Registered Email</Label>
                                        <InputGroup className="input-group-lg">
                                            <InputGroupText className="bg-white border-end-0 text-muted">
                                                <Mail size={20} />
                                            </InputGroupText>
                                            <Input 
                                                type="email" 
                                                id="email"
                                                required 
                                                placeholder="user@example.com"
                                                className="border-start-0 ps-0"
                                                value={email} 
                                                onChange={e => setEmail(e.target.value)}
                                                disabled={step !== 1} 
                                                style={{ boxShadow: 'none' }}
                                            />
                                        </InputGroup>
                                    </FormGroup>
                                    <Button color="primary" block size="lg" disabled={loading} className="rounded-3 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm">
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" /> Sending...
                                            </>
                                        ) : (
                                            'Send OTP'
                                        )}
                                    </Button>
                                </Form>
                                
                                <div className="text-center mt-4">
                                    <Link to="/login" className="text-decoration-none d-inline-flex align-items-center gap-2 text-muted fw-medium hover-primary">
                                        <ArrowLeft size={16} /> Back to Login
                                    </Link>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Modal OTP/PIN & Result */}
                <Modal isOpen={step > 1} toggle={() => {}} backdrop="static" centered className="modal-lg">
                    
                    {/* OTP & PIN Step */}
                    {step === 2 && (
                        <div className="p-2">
                            <ModalHeader className="border-0 pb-0">
                                <span className="fw-bold text-dark fs-4">Security Verification</span>
                            </ModalHeader>
                            <ModalBody className="p-4 pt-3">
                                {error && (
                                    <Alert color="danger" className="d-flex align-items-center gap-2 border-0 bg-danger bg-opacity-10 text-danger rounded-3 mb-4">
                                        <ShieldAlert size={18} />
                                        <span>{error}</span>
                                    </Alert>
                                )}
                                <p className="text-muted mb-4">
                                    We sent a code to <strong className="text-dark">{email}</strong>. <br/>
                                    Please enter it below along with your recovery PIN.
                                </p>
                                <Form onSubmit={handleVerifyAndRecover}>
                                    <Row>
                                        <Col md={12}>
                                            <FormGroup className="mb-4">
                                                <Label className="fw-medium text-secondary small text-uppercase">OTP Code</Label>
                                                <InputGroup className="input-group-lg">
                                                    <InputGroupText className="bg-white border-end-0 text-muted">
                                                        <Hash size={20} />
                                                    </InputGroupText>
                                                    <Input 
                                                        type="text" 
                                                        required 
                                                        placeholder="e.g. 123456"
                                                        className="border-start-0 ps-0"
                                                        value={otp} 
                                                        onChange={e => setOtp(e.target.value)}
                                                        autoFocus
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                </InputGroup>
                                            </FormGroup>
                                        </Col>
                                        <Col md={12}>
                                            <FormGroup className="mb-4">
                                                <Label className="fw-medium text-secondary small text-uppercase">Recovery PIN</Label>
                                                <InputGroup className="input-group-lg">
                                                    <InputGroupText className="bg-white border-end-0 text-muted">
                                                        <Lock size={20} />
                                                    </InputGroupText>
                                                    <Input 
                                                        type="password"
                                                        required 
                                                        placeholder="Enter your PIN"
                                                        className="border-start-0 ps-0"
                                                        value={pin} 
                                                        onChange={e => setPin(e.target.value)}
                                                        style={{ boxShadow: 'none' }}
                                                    />
                                                </InputGroup>
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                    
                                    <Button color="primary" block size="lg" disabled={loading} className="mt-2 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 py-3">
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" /> Verifying...
                                            </>
                                        ) : (
                                            'Recover Password'
                                        )}
                                    </Button>
                                </Form>
                            </ModalBody>
                            <ModalFooter className="border-0 pt-0 pb-4 justify-content-center">
                                <Button color="link" className="text-decoration-none text-muted" onClick={() => setStep(1)} disabled={loading}>
                                    Cancel & Go Back
                                </Button>
                            </ModalFooter>
                        </div>
                    )}

                    {/* Show Password Step */}
                    {step === 3 && (
                        <div className="p-3">
                            <ModalHeader className="border-0 pb-0 d-flex justify-content-center">
                                <div className="text-center w-100 mt-2">
                                     <div className="bg-success bg-opacity-10 d-inline-flex p-3 rounded-circle mb-3">
                                        <CheckCircle className="text-success" size={48} />
                                    </div>
                                    <h3 className="fw-bold text-success">Recovery Successful!</h3>
                                </div>
                            </ModalHeader>
                            <ModalBody className="text-center p-4">
                                <p className="text-muted mb-4">Your Master Password has been successfully decrypted.</p>
                                
                                <div className="p-4 bg-light border border-dashed border-secondary border-opacity-25 rounded-3 mb-4 position-relative">
                                    <h2 className="text-dark mb-0 fw-bold font-monospace text-break">
                                        {recoveredPass}
                                    </h2>
                                </div>

                                <Button color="outline-primary" className="mb-4 rounded-pill px-4 fw-medium" onClick={copyToClipboard}>
                                    <Copy size={16} className="me-2"/> Copy Password
                                </Button>

                                <Alert color="warning" className="text-start border-0 bg-warning bg-opacity-10 text-dark rounded-3 p-3">
                                    <h6 className="fw-bold alert-heading d-flex align-items-center gap-2">
                                        <ShieldAlert size={16}/> Security Note
                                    </h6>
                                    <span className="small">Use this password to login immediately. For better security, consider changing your password in the dashboard settings after logging in.</span>
                                </Alert>
                            </ModalBody>
                            <ModalFooter className="border-0 justify-content-center pb-4">
                                <Button color="primary" size="lg" className="rounded-3 px-5 fw-bold py-3" onClick={handleClose}>
                                    Go to Login
                                </Button>
                            </ModalFooter>
                        </div>
                    )}

                </Modal>
            </Container>
        </div>
    )
}

export default Recovery;