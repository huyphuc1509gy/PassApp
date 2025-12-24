import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    Container, Row, Col, Card, CardBody, CardTitle,
    Form, FormGroup, Label, Input, Button, Alert,
    Modal, ModalHeader, ModalBody, ModalFooter, Spinner
} from 'reactstrap';
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
        alert("Password copied!");
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={10} md={8} lg={6} xl={5}>
                    <Card className="shadow-sm border-0 w-100" style={{ minWidth: "360px" }}>
                        <CardBody className="p-4">
                            <CardTitle tag="h3" className="text-center mb-4 text-primary fw-bold">Recover Account</CardTitle>
                            
                            {/* Error */}
                            {step === 1 && error && <Alert color="danger" fade={false}>{error}</Alert>}

                            <Form onSubmit={handleSendOtp}>
                                <FormGroup>
                                    <Label for="email" className="fw-bold small">Registered Email</Label>
                                    <Input 
                                        type="email" 
                                        id="email"
                                        required 
                                        placeholder="user@example.com"
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)}
                                        disabled={step !== 1} 
                                    />
                                </FormGroup>
                                <Button color="primary" block size="lg" disabled={loading} className="mt-3 shadow-sm">
                                    {loading ? <Spinner size="sm"/> : 'Send OTP'}
                                </Button>
                            </Form>
                            
                            <div className="text-center mt-3">
                                <Link to="/login" className="text-decoration-none">Back to Login</Link>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal OTP/PIn*/}
            <Modal isOpen={step > 1} toggle={() => {}} backdrop="static" centered>
                
                {/* OTP & PIN */}
                {step === 2 && (
                    <>
                        <ModalHeader className="bg-primary text-white">Security Verification</ModalHeader>
                        <ModalBody>
                            {error && <Alert color="danger" fade={false}>{error}</Alert>}
                            <p className="text-muted small">Check your email for OTP. Enter the PIN you created during registration.</p>
                            <Form onSubmit={handleVerifyAndRecover}>
                                <FormGroup>
                                    <Label className="fw-bold small">OTP Code (from Email)</Label>
                                    <Input 
                                        type="text" 
                                        required 
                                        placeholder="123456"
                                        value={otp} 
                                        onChange={e => setOtp(e.target.value)}
                                        autoFocus
                                    />
                                </FormGroup>
                                <FormGroup>
                                    <Label className="fw-bold small">Recovery PIN</Label>
                                    <Input 
                                        type="password"
                                        required 
                                        placeholder="Enter your PIN"
                                        value={pin} 
                                        onChange={e => setPin(e.target.value)}
                                    />
                                </FormGroup>
                                <Button color="primary" block size="lg" disabled={loading} className="mt-4">
                                    {loading ? <Spinner size="sm"/> : 'Recover Password'}
                                </Button>
                            </Form>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="secondary" onClick={() => setStep(1)} disabled={loading}>Cancel</Button>
                        </ModalFooter>
                    </>
                )}

                {/* Show Password */}
                {step === 3 && (
                    <>
                        <ModalHeader className="bg-success text-white">Recovery Successful! </ModalHeader>
                        <ModalBody className="text-center">
                            <p>Here is your Master Password:</p>
                            
                            <div className="p-3 bg-light border rounded mb-3">
                                <h2 className="text-primary mb-0">{recoveredPass}</h2>
                            </div>

                            <Button color="outline-primary" size="sm" onClick={copyToClipboard} className="mb-3">
                                📋 Copy Password
                            </Button>

                            <Alert color="warning" className="text-start small" fade={false}>
                                <strong>Note:</strong> Use this password to login immediately. You can then change your new password in the Dashboard.
                            </Alert>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" block size="lg" onClick={handleClose}>
                                Go to Login
                            </Button>
                        </ModalFooter>
                    </>
                )}

            </Modal>
        </Container>
    )
}

export default Recovery;